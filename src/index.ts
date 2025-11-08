// // // src/index.ts
// // import dotenv from "dotenv";
// // import express from "express";
// // import cors from "cors";

// // import { ImapService } from "./services/imapService";
// // import emailsRouter from "./routes/emails";
// // import { checkElasticsearchHealth } from "./services/elasticService";

// // dotenv.config();

// // console.log("=".repeat(60));
// // console.log("Starting Email Monitor Service");
// // console.log("=".repeat(60));

// // const accounts = [
// //   {
// //     user: process.env.EMAIL1_USER!,
// //     pass: process.env.EMAIL1_PASS!,
// //     host: process.env.EMAIL1_HOST!,
// //     port: Number(process.env.EMAIL1_PORT!),
// //     name: "Account1",
// //   },
// //   {
// //     user: process.env.EMAIL2_USER!,
// //     pass: process.env.EMAIL2_PASS!,
// //     host: process.env.EMAIL2_HOST!,
// //     port: Number(process.env.EMAIL2_PORT!),
// //     name: "Account2",
// //   },
// // ];

// // // Validate configuration
// // const requiredEnvVars = [
// //   'CEREBRAS_API_KEY',
// //   'SLACK_TOKEN',
// //   'SLACK_CHANNEL',
// // ];

// // const missingVars = requiredEnvVars.filter(v => !process.env[v]);
// // if (missingVars.length > 0) {
// //   console.error("Missing required environment variables:");
// //   missingVars.forEach(v => console.error(`   - ${v}`));
// //   process.exit(1);
// // }

// // // Express app
// // const app = express();
// // app.use(cors({
// //   origin: [
// //     'http://localhost:3000',
// //     'https://your-frontend.vercel.app',
// //     /\.vercel\.app$/
// //   ],
// //   credentials: true
// // }));

// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // app.use("/emails", emailsRouter);

// // // Health endpoints
// // app.get("/", (req, res) => res.send("ReachInbox Onebox Backend - running"));
// // app.get("/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));
// // app.get("/health/elasticsearch", async (req, res) => {
// //   try {
// //     const h = await checkElasticsearchHealth();
// //     res.json(h);
// //   } catch (err: any) {
// //     console.error("ES health check error:", err);
// //     res.status(500).json({ connected: false });
// //   }
// // });

// // // IMAP Connections
// // console.log("\nConnecting to email accounts:");
// // accounts.forEach((acc, index) => {
// //   if (!acc.user || !acc.pass || !acc.host || !acc.port) {
// //     console.error(`${acc.name}: Missing credentials`);
// //     return;
// //   }
  
// //   console.log(`   ${index + 1}. ${acc.name} (${acc.user})`);
  
// //   try {
// //     const imapService = new ImapService(
// //       acc.user,
// //       acc.pass,
// //       acc.host,
// //       acc.port,
// //       acc.name
// //     );
// //     imapService.connectAndListen();
// //   } catch (error) {
// //     console.error(`${acc.name}: Failed to initialize -`, error);
// //   }
// // });

// // console.log("\nService started successfully!");
// // console.log("=".repeat(60));

// // // Graceful shutdown
// // process.on('SIGINT', () => {
// //   console.log("\n\nShutting down gracefully...");
// //   process.exit(0);
// // });

// // process.on('SIGTERM', () => {
// //   console.log("\n\nShutting down gracefully...");
// //   process.exit(0);
// // });

// // // Handle unhandled rejections
// // process.on('unhandledRejection', (reason, promise) => {
// //   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
// // });

// // process.on('uncaughtException', (error) => {
// //   console.error('Uncaught Exception:', error);
// //   process.exit(1);
// // });

// // const PORT = process.env.PORT || 5000;

// // app.listen(PORT, () => {
// //   console.log(`\n Server running on port ${PORT}`);
// //   console.log(`Health check: http://localhost:${PORT}/health`);
// // });

// // export default app;


// import dotenv from "dotenv";
// import express, { Request, Response } from 'express';
// import cors from 'cors';

// dotenv.config();

// console.log("=".repeat(60));
// console.log("Starting Email Monitor Service");
// console.log("=".repeat(60));

// const accounts = [
//   {
//     user: process.env.EMAIL1_USER!,
//     pass: process.env.EMAIL1_PASS!,
//     host: process.env.EMAIL1_HOST!,
//     port: Number(process.env.EMAIL1_PORT!),
//     name: "Account1",
//   },
//   {
//     user: process.env.EMAIL2_USER!,
//     pass: process.env.EMAIL2_PASS!,
//     host: process.env.EMAIL2_HOST!,
//     port: Number(process.env.EMAIL2_PORT!),
//     name: "Account2",
//   },
// ];

// // Validate configuration
// const requiredEnvVars = [
//   // If these are truly required for your app to function, ensure you set them
//   // in Render dashboard. For now we WARN instead of exiting to avoid crash loops.
//   'CEREBRAS_API_KEY',
//   'SLACK_TOKEN',
//   'SLACK_CHANNEL',
// ];

// const missingVars = requiredEnvVars.filter(v => !process.env[v]);

// if (missingVars.length > 0) {
//   console.warn('Warning: Missing some environment variables (service will still start).');
//   missingVars.forEach(v => console.warn(`   - ${v}`));
//   console.warn('Set them in Render Dashboard -> Service -> Environment to enable full functionality.');
// } else {
//   console.log('All required environment variables are present.');
// }

// // Print a short env summary (no secrets)
// console.log('ENV SUMMARY:', {
//   NODE_ENV: process.env.NODE_ENV || 'undefined',
//   PORT: process.env.PORT || 'undefined',
//   ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ? '[present]' : '[missing]',
//   ELASTICSEARCH_APIKEY: process.env.ELASTICSEARCH_APIKEY ? '[present]' : '[missing]',
//   CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY ? '[present]' : '[missing]',
//   SLACK_TOKEN: process.env.SLACK_TOKEN ? '[present]' : '[missing]',
// });

// // Express app
// const app = express();
// const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://reachinbox-onebox.vercel.app')
//   .split(',')
//   .map(s => s.trim())
//   .filter(Boolean);

// console.log('Allowed CORS origins:', allowedOrigins);

// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     if (/^https?:\/\/(.+\.)?vercel\.app$/.test(origin)) return callback(null, true);
//     console.warn('Blocked CORS origin:', origin);
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// import emailsRouter from "./routes/emails";
// import { checkElasticsearchHealth } from "./services/elasticService";
// import { ImapService } from "./services/imapService";

// app.use("/emails", emailsRouter);

// // Health endpoints
// app.get("/", (req: Request, res: Response) => res.send("ReachInbox Onebox Backend - running"));
// app.get("/health", (req: Request, res: Response) => res.json({ status: "ok", ts: new Date().toISOString() }));
// app.get("/health/elasticsearch", async (req: Request, res: Response) => {
//   try {
//     const h = await checkElasticsearchHealth();
//     res.json(h);
//   } catch (err: any) {
//     console.error("ES health check error:", err);
//     res.status(500).json({ connected: false });
//   }
// });

// // IMAP Connections
// console.log("\nConnecting to email accounts:");
// accounts.forEach((acc, index) => {
//   if (!acc.user || !acc.pass || !acc.host || !acc.port) {
//     console.error(`${acc.name}: Missing credentials`);
//     return;
//   }
  
//   console.log(`   ${index + 1}. ${acc.name} (${acc.user})`);
  
//   try {
//     const imapService = new ImapService(
//       acc.user,
//       acc.pass,
//       acc.host,
//       acc.port,
//       acc.name
//     );
//     imapService.connectAndListen();
//   } catch (error) {
//     console.error(`${acc.name}: Failed to initialize -`, error);
//   }
// });

// console.log("\nService started successfully!");
// console.log("=".repeat(60));

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`\nServer running on port ${PORT}\n`);
// });

// // Graceful shutdown
// process.on('SIGINT', () => {
//   console.log("\n\nShutting down gracefully...");
//   process.exit(0);
// });

// process.on('SIGTERM', () => {
//   console.log("\n\nShutting down gracefully...");
//   process.exit(0);
// });

// // Handle unhandled rejections
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
// });

// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   process.exit(1);
// });

// export default app;

// src/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

dotenv.config();

console.log("=".repeat(60));
console.log("Starting Email Monitor Service");
console.log("=".repeat(60));

// ---------- Accounts ----------
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

// ---------- Env var warnings ----------
const requiredEnvVars = [
  // These are helpful/important but we avoid exiting so the service can still start
  "CEREBRAS_API_KEY",
  "SLACK_TOKEN",
  "SLACK_CHANNEL",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(
    "Warning: Missing some environment variables (service will still start)."
  );
  missingVars.forEach((v) => console.warn(`   - ${v}`));
  console.warn(
    "Set them in your Render dashboard (or env) to enable full functionality."
  );
} else {
  console.log("All required environment variables are present.");
}

console.log("ENV SUMMARY:", {
  NODE_ENV: process.env.NODE_ENV || "undefined",
  PORT: process.env.PORT || "undefined",
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ? "[present]" : "[missing]",
  ELASTICSEARCH_APIKEY: process.env.ELASTICSEARCH_APIKEY
    ? "[present]"
    : "[missing]",
  CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY ? "[present]" : "[missing]",
  SLACK_TOKEN: process.env.SLACK_TOKEN ? "[present]" : "[missing]",
});

// ---------- Express setup ----------
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,https://reachinbox-onebox.vercel.app,https://reachinbox-onebox-ai-z353.onrender.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow vercel subdomains
      if (/^https?:\/\/(.+\.)?vercel\.app$/.test(origin)) return callback(null, true);
      // allow render subdomain pattern
      if (/^https?:\/\/(.+\.)?onrender\.com$/.test(origin)) return callback(null, true);
      console.warn("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Routes & services ----------
import emailsRouter from "./routes/emails";
import { checkElasticsearchHealth } from "./services/elasticService";
import { ImapService } from "./services/imapService";
import { getAiQueueStats } from "./services/aiService";

// mount emails routes
app.use("/emails", emailsRouter);

// Root + basic health
app.get("/", (_req: Request, res: Response) =>
  res.send("ReachInbox Onebox Backend - running")
);
app.get("/health", (_req: Request, res: Response) =>
  res.json({ status: "ok", ts: new Date().toISOString() })
);

// ES health
app.get("/health/elasticsearch", async (_req: Request, res: Response) => {
  try {
    const h = await checkElasticsearchHealth();
    res.json(h);
  } catch (err: any) {
    console.error("ES health check error:", err);
    res.status(500).json({ connected: false });
  }
});

// ---------- IMAP: create services and keep references ----------
console.log("\nConnecting to email accounts:");

/**
 * Keep ImapService instances here so we can:
 *  - trigger manual fetches for demos (/admin/fetch-now)
 *  - optionally enumerate connection state for /stats
 */
const imapServices: { instance: ImapService; name: string; user: string }[] = [];

accounts.forEach((acc, index) => {
  if (!acc.user || !acc.pass || !acc.host || !acc.port) {
    console.error(`${acc.name}: Missing credentials`);
    return;
  }

  console.log(`   ${index + 1}. ${acc.name} (${acc.user})`);

  try {
    const imapService = new ImapService(acc.user, acc.pass, acc.host, acc.port, acc.name);
    imapServices.push({ instance: imapService, name: acc.name, user: acc.user });
    imapService.connectAndListen();
  } catch (error) {
    console.error(`${acc.name}: Failed to initialize -`, error);
  }
});

console.log("\nService started successfully!");
console.log("=".repeat(60));

// ---------- /stats endpoint (enhanced) ----------
app.get("/stats", async (_req: Request, res: Response) => {
  try {
    const esHealth = await checkElasticsearchHealth().catch((e) => {
      console.warn("ES health fetch failed:", e?.message ?? e);
      return { connected: false };
    });

    // ai queue stats (if aiService available)
    let aiStats = null;
    try {
      aiStats = getAiQueueStats();
    } catch (err) {
      aiStats = null;
    }

    const accountsState = imapServices.map((s) => ({
      name: s.name,
      user: s.user,
      // We don't assume ImapService exposes a public `isConnected` boolean.
      // If it does, you can change this to read it directly (cast to any).
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

// ---------- Admin: trigger fetch now (demo) ----------
/**
 * WARNING: This endpoint is useful for demos but should be protected in production.
 * Add a simple token check or remove once you finish demoing.
 */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

app.post("/admin/fetch-now", async (req: Request, res: Response) => {
  // optional simple token auth for safety
  if (ADMIN_TOKEN) {
    const provided = (req.headers["x-admin-token"] || req.query.token || req.body.token) as string | undefined;
    if (!provided || provided !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  try {
    if (imapServices.length === 0) {
      return res.status(400).json({ ok: false, error: "No IMAP services configured" });
    }

    // Attempt to call private/public fetch method via any cast.
    const results = await Promise.all(
      imapServices.map(async (s) => {
        try {
          // safe-cast: call fetchRecentEmails if present
          const instAny = s.instance as any;

          if (typeof instAny.fetchRecentEmails === "function") {
            await instAny.fetchRecentEmails();
            return { name: s.name, ok: true };
          }

          // If private, try a trigger method if present
          if (typeof instAny.triggerFetchNow === "function") {
            await instAny.triggerFetchNow();
            return { name: s.name, ok: true };
          }

          // If neither present, attempt to re-connect (fallback)
          if (typeof instAny.connectAndListen === "function") {
            instAny.connectAndListen();
            return { name: s.name, ok: true, note: "reconnected" };
          }

          return { name: s.name, ok: false, error: "No fetch method available" };
        } catch (err: any) {
          return { name: s.name, ok: false, error: String(err?.message ?? err) };
        }
      })
    );

    res.json({ ok: true, results });
  } catch (err) {
    console.error("/admin/fetch-now error:", err);
    res.status(500).json({ ok: false, error: "Failed to trigger fetch" });
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}\n`);
});

// ---------- Graceful shutdown & global handlers ----------
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
