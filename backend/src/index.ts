import logger from './utils/logger';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();

logger.info('='.repeat(60));
logger.info('Starting Email Monitor Service');
logger.info('='.repeat(60));

// Import database connection
import { connectDB } from './config/database';
import { initializeAllUsers } from './services/imapManager';

// Import services for AI and notifications
import { categorizeEmail, getAiQueueStats } from './services/aiService';
import { notifySlack, triggerWebhook } from './services/notificationService';

const INTERESTED_CONFIDENCE_THRESHOLD = (() => {
  const v = Number(process.env.INTERESTED_CONFIDENCE_THRESHOLD ?? 0.6);
  if (Number.isNaN(v)) return 0.6;
  return Math.max(0, Math.min(1, v));
})();

// Express setup
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      // Allow all Vercel deployments
      if (/^https?:\/\/(.+\.)?vercel\.app$/.test(origin)) return callback(null, true);
      
      // Allow all Render deployments
      if (/^https?:\/\/(.+\.)?onrender\.com$/.test(origin)) return callback(null, true);
      
      // Allow localhost on any port (for development)
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      
      logger.warn('Blocked CORS origin:', origin);
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
import notificationsRouter from './routes/notifications'; // NEW
import { checkElasticsearchHealth } from './services/elasticService';

// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/emails', emailsRouter);
app.use('/notifications', notificationsRouter); // NEW

app.get('/', (_req: Request, res: Response) =>
  res.send('InboxFlow Backend - running')
);

app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

app.get('/health/elasticsearch', async (_req: Request, res: Response) => {
  try {
    const h = await checkElasticsearchHealth();
    res.json(h);
  } catch (err: any) {
    logger.error('ES health check error:', err);
    res.status(500).json({ connected: false });
  }
});

// Stats endpoint
app.get('/stats', async (_req: Request, res: Response) => {
  try {
    const esHealth = await checkElasticsearchHealth().catch((e) => {
      logger.warn('ES health fetch failed:', e?.message ?? e);
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
    logger.error('/stats error:', err);
    res.status(500).json({ ok: false, error: 'Failed to get stats' });
  }
});

// AI Categorization endpoint
app.post('/api/ai/classify', async (req: Request, res: Response) => {
  const { subject = '', body = '', from = '', account = '', folder = '' } = req.body ?? {};
  if (!body && !subject) return res.status(400).json({ error: 'Missing subject/body' });

  try {
    const result = await categorizeEmail(subject, body);
    if (result.label === 'Interested' && result.confidence >= INTERESTED_CONFIDENCE_THRESHOLD) {
      try {
        const payload = {
          subject,
          from: from || 'Unknown',
          body: (body || '').slice(0, 300),
          category: result.label,
          confidence: result.confidence,
          account: account || 'API',
          folder: folder || 'API',
          date: new Date(),
          messageId: undefined,
        };
        notifySlack(payload).catch((e) => logger.error('>>> Slack notify error:', e?.message ?? e));
        triggerWebhook(payload).catch((e) => logger.error('>>> Webhook trigger error:', e?.message ?? e));
      } catch (notifyErr: any) {
        logger.error('>>> Notification error:', notifyErr?.message ?? notifyErr);
      }
    }

    return res.json({ ok: true, result });
  } catch (err: any) {
    logger.error('>>> /api/ai/classify error:', err?.message ?? err);
    res.status(500).json({ ok: false, error: 'AI classification failed' });
  }
});

// Slack notification test endpoint
app.post('/api/notify/slack', async (req: Request, res: Response) => {
  try {
    const payload = {
      subject: req.body.subject || 'Test Subject',
      from: req.body.from || 'test@example.com',
      body: req.body.body || 'Test message',
      category: req.body.category || 'Interested',
      account: req.body.account || 'Test',
      folder: req.body.folder || 'INBOX',
      date: req.body.date || new Date(),
      messageId: req.body.messageId,
    };

    const success = await notifySlack(payload);
    res.json({ ok: success });
  } catch (err: any) {
    logger.error('>>> Slack notify error:', err.message || err);
    res.status(500).json({ error: 'Slack notification failed' });
  }
});

// Webhook trigger test endpoint
app.post('/api/notify/webhook', async (req: Request, res: Response) => {
  try {
    const payload = {
      subject: req.body.subject || 'Test Subject',
      from: req.body.from || 'test@example.com',
      category: req.body.category || 'Interested',
      account: req.body.account || 'Test',
      folder: req.body.folder || 'INBOX',
      date: req.body.date || new Date(),
      messageId: req.body.messageId,
    };

    const success = await triggerWebhook(payload);
    res.json({ ok: success });
  } catch (err: any) {
    logger.error('>>> Webhook notify error:', err.message || err);
    res.status(500).json({ error: 'Webhook trigger failed' });
  }
});

// List all routes
app.get('/routes', (_req: Request, res: Response) => {
  const routes: string[] = [];
  (app as any)._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route;
        if (route) {
          routes.push(`${Object.keys(route.methods).join(',').toUpperCase()} ${route.path}`);
        }
      });
    }
  });
  res.json({ routes });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Initialize IMAP connections for all users
    await initializeAllUsers();
    logger.info('IMAP connections initialized');

    app.listen(PORT, () => {
      logger.info(`\nServer running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Shutdown handlers
process.on('SIGINT', () => {
  logger.info('\n\nShutting down gracefully...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('\n\nShutting down gracefully...');
  process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;