// src/services/notificationService.ts
import { WebClient } from '@slack/web-api';
import axios, { AxiosError } from 'axios';
import PQueue from 'p-queue';
import 'dotenv/config';
import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

const SLACK_TOKEN = process.env.SLACK_TOKEN || '';
const SLACK_CHANNEL_RAW = process.env.SLACK_CHANNEL || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

// Slack Rate limiting
const SLACK_CONCURRENCY = Number(process.env.SLACK_CONCURRENCY || 1);
const SLACK_INTERVAL_CAP = Number(process.env.SLACK_INTERVAL_CAP || 1);
const SLACK_INTERVAL_MS = Number(process.env.SLACK_INTERVAL_MS || 3000);

const WEBHOOK_CONCURRENCY = Number(process.env.WEBHOOK_CONCURRENCY || 1);
const WEBHOOK_INTERVAL_CAP = Number(process.env.WEBHOOK_INTERVAL_CAP || 1);
const WEBHOOK_INTERVAL_MS = Number(process.env.WEBHOOK_INTERVAL_MS || 2000);

const slackClient = new WebClient(SLACK_TOKEN);

// Separate queues for Slack and Webhook
const slackQueue = new PQueue({
  concurrency: SLACK_CONCURRENCY,
  intervalCap: SLACK_INTERVAL_CAP,
  interval: SLACK_INTERVAL_MS,
});

const webhookQueue = new PQueue({
  concurrency: WEBHOOK_CONCURRENCY,
  intervalCap: WEBHOOK_INTERVAL_CAP,
  interval: WEBHOOK_INTERVAL_MS,
});

// Dedupe caches
const SLACK_DEDUPE_TTL_MS = Number(process.env.SLACK_DEDUPE_TTL_MS || 24 * 60 * 60 * 1000);
const WEBHOOK_DEDUPE_TTL_MS = Number(process.env.WEBHOOK_DEDUPE_TTL_MS || 5 * 60 * 1000);

const slackSentCache = new Map<string, number>();
const webhookSentCache = new Map<string, number>();

function shouldSend(cache: Map<string, number>, key: string, ttlMs: number) {
  const prev = cache.get(key);
  if (!prev || Date.now() - prev > ttlMs) {
    cache.set(key, Date.now());
    return true;
  }
  return false;
}

function normalizeChannel(raw: string) {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('#')) return trimmed.slice(1);
  return trimmed;
}

function formatFromField(raw: any): string {
  if (!raw) return 'Unknown sender';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map(r => {
        if (typeof r === 'string') return r;
        if (r.address && r.name) return `${r.name} <${r.address}>`;
        if (r.address) return r.address;
        if (r.name) return r.name;
        return JSON.stringify(r);
      })
      .join(', ');
  }
  if (raw.address) return raw.name ? `${raw.name} <${raw.address}>` : raw.address;
  if (raw.name) return raw.name;
  return String(raw);
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of slackSentCache) {
    if (now - ts > SLACK_DEDUPE_TTL_MS) slackSentCache.delete(k);
  }
  for (const [k, ts] of webhookSentCache) {
    if (now - ts > WEBHOOK_DEDUPE_TTL_MS) webhookSentCache.delete(k);
  }
}, 10 * 60 * 1000);

// Queue metrics
setInterval(() => {
  const slackSize = slackQueue.size;
  const webhookSize = webhookQueue.size;
  if (slackSize > 3 || webhookSize > 3) {
    console.log(
      `[Queue Stats] Slack: ${slackSize} waiting, ${(slackQueue as any).pending || 0} pending | ` +
      `Webhook: ${webhookSize} waiting, ${(webhookQueue as any).pending || 0} pending`
    );
  }
}, 10000);

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Save notification to database
async function saveNotification(
  userId: string,
  email: any,
  slackSuccess: boolean,
  webhookSuccess: boolean
) {
  try {
    const db = await getDB();
    
    const notification = {
      userId: new ObjectId(userId),
      emailId: email._id || email.messageId || '',
      subject: email.subject || '(No Subject)',
      from: formatFromField(email.from),
      category: email.category || 'Interested',
      account: email.accountEmail || email.account || 'Unknown',
      timestamp: new Date(),
      slackSent: slackSuccess,
      webhookSent: webhookSuccess,
      read: false,
    };

    await db.collection('notifications').insertOne(notification);
    console.log('[Notification] Saved to database for user:', userId);
  } catch (err) {
    console.error('[Notification] Failed to save:', err);
  }
}

// Slack sender with retry logic
export const notifySlack = async (email: any): Promise<boolean> => {
  const channel = normalizeChannel(SLACK_CHANNEL_RAW);
  if (!SLACK_TOKEN) {
    console.warn('[Slack] SLACK_TOKEN not set. Skipping.');
    return false;
  }
  if (!channel) {
    console.warn('[Slack] SLACK_CHANNEL not set. Skipping.');
    return false;
  }

  const fromStr = formatFromField(email.from);
  const key = email.messageId || `${(email.subject || '').slice(0, 200)}|${fromStr}`;
  
  if (!shouldSend(slackSentCache, key, SLACK_DEDUPE_TTL_MS)) {
    return false;
  }

  return slackQueue.add(async () => {
    const maxRetries = 4;
    const baseDelay = 2000;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const slackAccountDisplay = email.accountEmail || email.account || 'unknown-account';
        const slackText =
          `*New Interested Email*\n` +
          `*Subject:* ${email.subject}\n` +
          `*From:* ${fromStr}\n` +
          `*Account:* ${slackAccountDisplay}\n` +
          `*Folder:* ${email.folder || 'INBOX'}`;

        const res = await slackClient.chat.postMessage({
          channel,
          text: slackText,
        });

        if ((res as any).ok) {
          console.log(`[Slack] Message posted to ${channel}`);
          return true;
        } else {
          console.warn('[Slack] Non-ok response:', res);
          slackSentCache.delete(key);
          return false;
        }
      } catch (err: any) {
        const errorCode = err?.data?.error || err?.code || err?.message || 'unknown';
        
        if (errorCode === 'rate_limited' || err?.data?.error === 'rate_limited') {
          const retryAfter = err?.data?.retry_after || (attempt + 1) * 3;
          const waitMs = retryAfter * 1000;
          
          console.warn(
            `[Slack] Rate limited on attempt ${attempt}. ` +
            `Waiting ${waitMs}ms before retry...`
          );
          
          if (attempt < maxRetries) {
            await sleep(waitMs);
            continue;
          }
        }

        if (errorCode === 'channel_not_found') {
          console.error('[Slack] channel_not_found — fix suggestions:');
          console.error('  • Use channel name without "#" (e.g. all-mail) OR channel ID (C01234567)');
          console.error('  • Invite bot to channel: /invite @your-bot');
          console.error('  • Ensure bot has chat:write scope');
          slackSentCache.delete(key);
          return false;
        }

        if (attempt >= maxRetries) {
          console.error(`[Slack] Failed after ${maxRetries} retries:`, errorCode);
          slackSentCache.delete(key);
          return false;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 1000);
        console.warn(`[Slack] Error: ${errorCode}. Retrying in ${delay}ms (attempt ${attempt + 1})`);
        await sleep(delay);
      }
    }

    slackSentCache.delete(key);
    return false;
  });
};

// Webhook helpers
function parseRetryAfter(header?: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  const sec = Number(trimmed);
  if (!Number.isNaN(sec)) return sec * 1000;
  const date = Date.parse(trimmed);
  if (!Number.isNaN(date)) {
    const delta = date - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

async function sendWebhookOnce(email: any) {
  return axios.post(WEBHOOK_URL, {
    subject: email.subject,
    from: formatFromField(email.from),
    category: email.category,
    account: email.account,
    folder: email.folder,
    date: email.date
  }, {
    timeout: 10000,
    validateStatus: null
  });
}

export const triggerWebhook = async (email: any): Promise<boolean> => {
  if (!WEBHOOK_URL) {
    return false;
  }

  const fromStr = formatFromField(email.from);
  const key = email.messageId || `${(email.subject || '').slice(0, 200)}|${fromStr}`;
  
  if (!shouldSend(webhookSentCache, key, WEBHOOK_DEDUPE_TTL_MS)) {
    return false;
  }

  return webhookQueue.add(async () => {
    const maxRetries = 4;
    const baseDelay = 1000;
    const maxDelay = 30000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await sendWebhookOnce(email);

        if (resp.status >= 200 && resp.status < 300) {
          console.log(`[Webhook] POST success ${resp.status}`);
          return true;
        }

        if (resp.status === 429) {
          const ra = parseRetryAfter(resp.headers['retry-after']);
          if (ra !== null) {
            console.warn(`[Webhook] 429 Retry-After: ${ra}ms`);
            await sleep(ra);
          } else {
            const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500), maxDelay);
            console.warn(`[Webhook] 429 backing off ${delay}ms (attempt ${attempt})`);
            await sleep(delay);
          }
        } else if (resp.status >= 500) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500), maxDelay);
          console.warn(`[Webhook] Server ${resp.status}. Retry after ${delay}ms`);
          await sleep(delay);
        } else {
          console.error(`[Webhook] Non-retryable ${resp.status}`);
          webhookSentCache.delete(key);
          return false;
        }
      } catch (err) {
        const e = err as AxiosError;
        if (attempt >= maxRetries) {
          console.error(`[Webhook] Network error after ${maxRetries} retries:`, e?.message);
          webhookSentCache.delete(key);
          return false;
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500), maxDelay);
        console.warn(`[Webhook] Network error. Retry in ${delay}ms (attempt ${attempt + 1})`);
        await sleep(delay);
      }
    }

    webhookSentCache.delete(key);
    return false;
  });
};

// NEW: Combined notification function with userId
export const notifySlackAndWebhook = async (email: any, userId: string): Promise<{ slackSuccess: boolean; webhookSuccess: boolean }> => {
  const slackSuccess = await notifySlack(email);
  const webhookSuccess = WEBHOOK_URL ? await triggerWebhook(email) : false;
  
  // Save notification to database
  await saveNotification(userId, email, slackSuccess, webhookSuccess);
  
  return { slackSuccess, webhookSuccess };
};