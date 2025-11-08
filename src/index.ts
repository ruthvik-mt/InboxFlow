// src/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

dotenv.config();

console.log("=".repeat(60));
console.log("Starting Email Monitor Service");
console.log("=".repeat(60));

// Accounts
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

// ---------- Express setup ----------
const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^https?:\/\/(.+\.)?vercel\.app$/.test(origin)) return callback(null, true);
      if (/^https?:\/\/(.+\.)?onrender\.com$/.test(origin)) return callback(null, true);
      console.warn("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Imports
import emailsRouter from "./routes/emails";
import { checkElasticsearchHealth } from "./services/elasticService";
import { ImapService } from "./services/imapService";
import { getAiQueueStats } from "./services/aiService";

// Routes
app.use("/emails", emailsRouter);

app.get("/", (_req: Request, res: Response) =>
  res.send("ReachInbox Onebox Backend - running")
);
app.get("/health", (_req: Request, res: Response) =>
  res.json({ status: "ok", ts: new Date().toISOString() })
);
app.get("/health/elasticsearch", async (_req: Request, res: Response) => {
  try {
    const h = await checkElasticsearchHealth();
    res.json(h);
  } catch (err: any) {
    console.error("ES health check error:", err);
    res.status(500).json({ connected: false });
  }
});

//IMAP Connections
console.log("\nConnecting to email accounts:");

const imapServices: { instance: ImapService; name: string; user: string }[] = [];

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
    
    const anyImap = imapService as any;
    anyImap.imap?.once?.("error", (err: any) => {
      console.error(`[${acc.name}] IMAP Error:`, err.message);
      setTimeout(() => {
        try {
          console.log(`[${acc.name}] Attempting reconnect...`);
          imapService.connectAndListen();
        } catch (e) {
          console.error(`[${acc.name}] Reconnect failed:`, e);
        }
      }, 10000);
    });

    anyImap.imap?.once?.("end", () => {
      console.warn(`[${acc.name}] IMAP connection ended. Reconnecting...`);
      setTimeout(() => {
        try {
          imapService.connectAndListen();
        } catch (e) {
          console.error(`[${acc.name}] Reconnect failed:`, e);
        }
      }, 10000);
    });

    imapServices.push({ instance: imapService, name: acc.name, user: acc.user });
    imapService.connectAndListen();
  } catch (error) {
    console.error(`${acc.name}: Failed to initialize -`, error);
  }
});

console.log("\nService started successfully!");
console.log("=".repeat(60));

// stats endpoint
app.get("/stats", async (_req: Request, res: Response) => {
  try {
    const esHealth = await checkElasticsearchHealth().catch((e) => {
      console.warn("ES health fetch failed:", e?.message ?? e);
      return { connected: false };
    });

    let aiStats = null;
    try {
      aiStats = getAiQueueStats();
    } catch {
      aiStats = null;
    }

    const accountsState = imapServices.map((s) => ({
      name: s.name,
      user: s.user,
      connected: Boolean((s.instance as any)?.isConnected ?? null),
      lastFetch: (s.instance as any)?.lastFetchAt ?? null,
    }));

    res.json({
      ok: true,
      time: new Date().toISOString(),
      es: esHealth,
      ai: aiStats,
      accounts: accountsState,
      imapServiceCount: imapServices.length,
    });
  } catch (err) {
    console.error("/stats error:", err);
    res.status(500).json({ ok: false, error: "Failed to get stats" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}\n`);
});

// Shutdown handlers
process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

export default app;
