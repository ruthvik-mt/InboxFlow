import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();

console.log('='.repeat(60));
console.log('Starting Email Monitor Service');
console.log('='.repeat(60));

// Import database connection
import { connectDB } from './config/database';
import { initializeAllUsers } from './services/imapManager';

// Env Var Check
const requiredEnvVars = ['CEREBRAS_API_KEY', 'SLACK_TOKEN', 'SLACK_CHANNEL', 'MONGO_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.warn('Missing environment variables (service may not work properly):');
  missingVars.forEach((v) => console.warn(`   - ${v}`));
} else {
  console.log('All required environment variables are present.');
}

// Express setup
const app = express();

// ✅ Updated CORS configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,https://reachinbox-onebox.vercel.app,https://reachinbox-onebox-ai-z353.onrender.com'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      
      // Allow all Vercel deployments
      if (/^https?:\/\/(.+\.)?vercel\.app$/.test(origin)) return callback(null, true);
      
      // Allow all Render deployments
      if (/^https?:\/\/(.+\.)?onrender\.com$/.test(origin)) return callback(null, true);
      
      // Allow localhost on any port (for development)
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      
      console.warn('Blocked CORS origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Import routes
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import emailsRouter from './routes/emails';
import { checkElasticsearchHealth } from './services/elasticService';
import { getAiQueueStats } from './services/aiService';

// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/emails', emailsRouter);

app.get('/', (_req: Request, res: Response) =>
  res.send('ReachInbox Onebox Backend - running')
);

app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

app.get('/health/elasticsearch', async (_req: Request, res: Response) => {
  try {
    const h = await checkElasticsearchHealth();
    res.json(h);
  } catch (err: any) {
    console.error('ES health check error:', err);
    res.status(500).json({ connected: false });
  }
});

// Stats endpoint
app.get('/stats', async (_req: Request, res: Response) => {
  try {
    const esHealth = await checkElasticsearchHealth().catch((e) => {
      console.warn('ES health fetch failed:', e?.message ?? e);
      return { connected: false };
    });

    let aiStats = null;
    try {
      aiStats = getAiQueueStats();
    } catch {
      aiStats = null;
    }

    res.json({
      ok: true,
      time: new Date().toISOString(),
      es: esHealth,
      ai: aiStats,
    });
  } catch (err) {
    console.error('/stats error:', err);
    res.status(500).json({ ok: false, error: 'Failed to get stats' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Initialize IMAP connections for all users
    await initializeAllUsers();
    console.log('✅ IMAP connections initialized');

    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Shutdown handlers
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;