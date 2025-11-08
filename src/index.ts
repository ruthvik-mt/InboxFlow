// src/index.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { ImapService } from "./services/imapService";
import emailsRouter from "./routes/emails";
import { checkElasticsearchHealth } from "./services/elasticService";

dotenv.config();

console.log("=".repeat(60));
console.log("Starting Email Monitor Service");
console.log("=".repeat(60));

const accounts = [
  {
    user: process.env.EMAIL1_USER!,
    pass: process.env.EMAIL1_PASS!,
    host: process.env.EMAIL1_HOST!,
    port: Number(process.env.EMAIL1_PORT!),
    name: "Account1",
  },
  {
    user: process.env.EMAIL2_USER!,
    pass: process.env.EMAIL2_PASS!,
    host: process.env.EMAIL2_HOST!,
    port: Number(process.env.EMAIL2_PORT!),
    name: "Account2",
  },
];

// Validate configuration
const requiredEnvVars = [
  'CEREBRAS_API_KEY',
  'SLACK_TOKEN',
  'SLACK_CHANNEL',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing required environment variables:");
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

// Express app
const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/emails", emailsRouter);

// Health endpoints
app.get("/", (req, res) => res.send("ReachInbox Onebox Backend - running"));
app.get("/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));
app.get("/health/elasticsearch", async (req, res) => {
  try {
    const h = await checkElasticsearchHealth();
    res.json(h);
  } catch (err: any) {
    console.error("ES health check error:", err);
    res.status(500).json({ connected: false });
  }
});

// IMAP Connections
console.log("\nConnecting to email accounts:");
accounts.forEach((acc, index) => {
  if (!acc.user || !acc.pass || !acc.host || !acc.port) {
    console.error(`${acc.name}: Missing credentials`);
    return;
  }
  
  console.log(`   ${index + 1}. ${acc.name} (${acc.user})`);
  
  try {
    const imapService = new ImapService(
      acc.user,
      acc.pass,
      acc.host,
      acc.port,
      acc.name
    );
    imapService.connectAndListen();
  } catch (error) {
    console.error(`${acc.name}: Failed to initialize -`, error);
  }
});

console.log("\nService started successfully!");
console.log("=".repeat(60));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
