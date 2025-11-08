// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
// import dotenv from 'dotenv';
// dotenv.config();

// import { categorizeEmail, getAiQueueStats } from './services/aiService';
// import { notifySlack, triggerWebhook } from './services/notificationService';
// import emailsRouter from './routes/emails';

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());
// app.use('/emails', emailsRouter);

// const PORT = Number(process.env.PORT || 5000);
// const INTERESTED_CONFIDENCE_THRESHOLD = (() => {
//   const v = Number(process.env.INTERESTED_CONFIDENCE_THRESHOLD ?? 0.6);
//   if (Number.isNaN(v)) return 0.6;
//   return Math.max(0, Math.min(1, v));
// })();

// app.get('/', (_req, res) => {
//   res.send(`
//     <h2>ReachInbox Onebox Backend</h2>
//     <p>Service running...</p>
//   `);
// });

// app.get('/health', (_req, res) => {
//   res.json({ status: 'Server running', time: new Date().toISOString() });
// });

// // Stats endpoint
// app.get('/stats', (_req, res) => {
//   try {
//     const aiStats = getAiQueueStats();
//     res.json({
//       timestamp: new Date().toISOString(),
//       cerebras: aiStats,
//     });
//   } catch (err: any) {
//     res.status(500).json({ error: 'Failed to fetch stats' });
//   }
// });

// // AI Categorization endpoint
// app.post('/api/ai/classify', async (req, res) => {
//   const { subject = '', body = '', from = '', account = '', folder = '' } = req.body ?? {};
//   if (!body && !subject) return res.status(400).json({ error: 'Missing subject/body' });

//   try {
//     const result = await categorizeEmail(subject, body);
//     if (result.label === 'Interested' && result.confidence >= INTERESTED_CONFIDENCE_THRESHOLD) {
//       try {
//         const payload = {
//           subject,
//           from: from || 'Unknown',
//           body: (body || '').slice(0, 300),
//           category: result.label,
//           confidence: result.confidence,
//           account: account || 'API',
//           folder: folder || 'API',
//           date: new Date(),
//           messageId: undefined,
//         };
//         notifySlack(payload).catch((e) => console.error('>>> Slack notify error:', e?.message ?? e));
//         triggerWebhook(payload).catch((e) => console.error('>>> Webhook trigger error:', e?.message ?? e));
//       } catch (notifyErr: any) {
//         console.error('>>> Notification error:', notifyErr?.message ?? notifyErr);
//       }
//     }

//     return res.json({ ok: true, result });
//   } catch (err: any) {
//     console.error('>>> /api/ai/classify error:', err?.message ?? err);
//     res.status(500).json({ ok: false, error: 'AI classification failed' });
//   }
// });

// // Slack notification test endpoint
// app.post('/api/notify/slack', async (req, res) => {
//   try {
//     const payload = {
//       subject: req.body.subject || 'Test Subject',
//       from: req.body.from || 'test@example.com',
//       body: req.body.body || 'Test message',
//       category: req.body.category || 'Interested',
//       account: req.body.account || 'Test',
//       folder: req.body.folder || 'INBOX',
//       date: req.body.date || new Date(),
//       messageId: req.body.messageId,
//     };

//     const success = await notifySlack(payload);
//     res.json({ ok: success });
//   } catch (err: any) {
//     console.error('>>> Slack notify error:', err.message || err);
//     res.status(500).json({ error: 'Slack notification failed' });
//   }
// });

// // Webhook trigger test endpoint
// app.post('/api/notify/webhook', async (req, res) => {
//   try {
//     const payload = {
//       subject: req.body.subject || 'Test Subject',
//       from: req.body.from || 'test@example.com',
//       category: req.body.category || 'Interested',
//       account: req.body.account || 'Test',
//       folder: req.body.folder || 'INBOX',
//       date: req.body.date || new Date(),
//       messageId: req.body.messageId,
//     };

//     const success = await triggerWebhook(payload);
//     res.json({ ok: success });
//   } catch (err: any) {
//     console.error('>>> Webhook notify error:', err.message || err);
//     res.status(500).json({ error: 'Webhook trigger failed' });
//   }
// });

// // List all routes
// app.get('/routes', (_req, res) => {
//   const routes: string[] = [];
//   app._router.stack.forEach((middleware: any) => {
//     if (middleware.route) {
//       routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
//     } else if (middleware.name === 'router') {
//       middleware.handle.stack.forEach((handler: any) => {
//         const route = handler.route;
//         if (route) {
//           routes.push(`${Object.keys(route.methods).join(',').toUpperCase()} ${route.path}`);
//         }
//       });
//     }
//   });
//   res.json({ routes });
// });

// app.listen(PORT, () => {
//   console.log(`\nServer running on port ${PORT}`);
// });

// export default app;


import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { categorizeEmail, getAiQueueStats } from './services/aiService';
import { notifySlack, triggerWebhook } from './services/notificationService';
import emailsRouter from './routes/emails';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    /\.vercel\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use('/emails', emailsRouter);

const INTERESTED_CONFIDENCE_THRESHOLD = (() => {
  const v = Number(process.env.INTERESTED_CONFIDENCE_THRESHOLD ?? 0.6);
  if (Number.isNaN(v)) return 0.6;
  return Math.max(0, Math.min(1, v));
})();

app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <h2>ReachInbox Onebox Backend</h2>
    <p>Service running...</p>
  `);
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'Server running', time: new Date().toISOString() });
});

// Stats endpoint
app.get('/stats', (_req: Request, res: Response) => {
  try {
    const aiStats = getAiQueueStats();
    res.json({
      timestamp: new Date().toISOString(),
      cerebras: aiStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats' });
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
        notifySlack(payload).catch((e) => console.error('>>> Slack notify error:', e?.message ?? e));
        triggerWebhook(payload).catch((e) => console.error('>>> Webhook trigger error:', e?.message ?? e));
      } catch (notifyErr: any) {
        console.error('>>> Notification error:', notifyErr?.message ?? notifyErr);
      }
    }

    return res.json({ ok: true, result });
  } catch (err: any) {
    console.error('>>> /api/ai/classify error:', err?.message ?? err);
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
    console.error('>>> Slack notify error:', err.message || err);
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
    console.error('>>> Webhook notify error:', err.message || err);
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

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}\n`);
});

export default app;