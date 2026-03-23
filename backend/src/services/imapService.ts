import logger from '../utils/logger';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { indexEmail, isEmailIndexed } from './elasticService';
import { categorizeEmail } from './aiService';
import { Readable } from 'stream';
import { decrypt } from '../utils/encryption';
import { notifySlackAndWebhook } from './notificationService';

interface Email {
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  account?: string;
  accountEmail?: string;
  folder?: string;
  category?: string;
  messageId?: string;
}

const processedMessageIds = new Set<string>();
const EMAIL_PROCESSING_QUEUE: Array<{ email: Email; retries: number; userId: string }> = [];
let isProcessingQueue = false;
const MAX_PROCESSING_RETRIES = 3;
const EMAIL_BATCH_SIZE = Number(process.env.EMAIL_BATCH_SIZE || 10);
const EMAIL_BATCH_DELAY_MS = Number(process.env.EMAIL_BATCH_DELAY_MS || 30000);

function addressToString(addr: any): string {
  if (!addr) return '';
  if (Array.isArray(addr))
    return addr.map((a: any) => a?.address || a?.value || a?.text || '').filter(Boolean).join(', ');
  return addr?.address || addr?.value || addr?.text || '';
}

function normalizeCategory(raw: any): string {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('meeting booked')) return 'Meeting Booked';
  if (s.includes('out of office')) return 'Out of Office';
  if (s.includes('spam')) return 'Spam';
  if (s.includes('interested') && !s.includes('not interested')) return 'Interested';
  if (s.includes('not interested')) return 'Not Interested';
  return 'Not Interested';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processEmailQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  let processedCount = 0;

  while (EMAIL_PROCESSING_QUEUE.length > 0) {
    const item = EMAIL_PROCESSING_QUEUE.shift();
    if (!item) continue;

    const { email, retries, userId } = item;

    try {
      const classification = await categorizeEmail(email.subject || '', email.body || '');
      email.category = normalizeCategory(classification?.label ?? classification);

      try {
        await indexEmail(email);
      } catch (indexErr) {
        logger.error(`[${email.account}] Elasticsearch indexing failed:`, indexErr);
        const dedupeKey = email.messageId || `${(email.subject || '').slice(0, 200)}|${email.from}|${String(email.date || '')}`;
        if (dedupeKey) processedMessageIds.delete(dedupeKey);
      }

      if (email.category === 'Interested') {
        try {
          await notifySlackAndWebhook(email, userId);
        } catch (e) {
          logger.error(`[${email.account}] Notification error:`, e);
        }
      }

      logger.info(`[${email.account}] ${email.subject || '(no subject)'} | ${email.category}`);

      processedCount++;

      if (processedCount % EMAIL_BATCH_SIZE === 0 && EMAIL_PROCESSING_QUEUE.length > 0) {
        logger.info(`[Batch Processing] Processed ${processedCount} emails. Pausing for ${EMAIL_BATCH_DELAY_MS / 1000}s...`);
        logger.info(`[Batch Processing] Remaining in queue: ${EMAIL_PROCESSING_QUEUE.length}`);
        await sleep(EMAIL_BATCH_DELAY_MS);
      } else {
        await sleep(500);
      }
    } catch (error: any) {
      logger.error(`[${email.account}] Error processing email (attempt ${retries + 1}/${MAX_PROCESSING_RETRIES}):`, error?.message || error);

      if (retries < MAX_PROCESSING_RETRIES - 1) {
        EMAIL_PROCESSING_QUEUE.push({ email, retries: retries + 1, userId });
        await sleep(2000 * (retries + 1));
      } else {
        logger.error(`[${email.account}] Gave up after ${MAX_PROCESSING_RETRIES} attempts`);
        email.category = 'Not Interested';
        try {
          await indexEmail(email);
        } catch (e) {
          logger.error(`[${email.account}] Failed to index after giving up:`, e);
        }
      }
    }
  }

  isProcessingQueue = false;
  logger.info(`[Batch Processing] Completed processing ${processedCount} emails`);
}

export class ImapService {
  private imap: Imap;
  private accountName!: string;
  private loginEmail!: string;
  private isConnected: boolean = false;
  public userId: string;
  public accountId: string;

  // ✅ ADDED: reconnect tracking for exponential backoff
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT = 10;

  // ✅ ADDED: store imap config for re-creating instance on reconnect
  private readonly imapConfig: Imap.Config;

  constructor(
    user: string,
    encryptedPassword: string,
    host: string,
    port: number,
    accountName: string,
    userId: string,
    accountId: string
  ) {
    this.accountName = accountName;
    this.loginEmail = user;
    this.userId = userId;
    this.accountId = accountId;

    const password = decrypt(encryptedPassword);

    // ✅ ADDED: save config so we can recreate imap instance on reconnect
    this.imapConfig = {
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    };

    this.imap = new Imap(this.imapConfig);
  }

  public connectAndListen() {
    this.imap.once('ready', () => {
      this.isConnected = true;
      // ✅ ADDED: reset reconnect counter on successful connection
      this.reconnectAttempts = 0;

      this.openInbox((err, box) => {
        if (err) {
          logger.error(`[${this.accountName}] Failed to open inbox:`, err);
          return;
        }
        logger.info(`[${this.accountName}] IMAP connected. Total messages: ${box.messages.total}`);
        this.fetchRecentEmails('INBOX');

        this.imap.removeAllListeners('mail');
        this.imap.on('mail', () => {
          logger.info(`[${this.accountName}] New mail notification received`);
          this.fetchRecentEmails('INBOX');
        });
      });
    });

    this.imap.once('error', (err: Error) => {
      logger.error(`[${this.accountName}] IMAP Error:`, err.message);
      this.isConnected = false;
    });

    // ✅ CHANGED: was just logging + setting isConnected = false (silent failure on drop)
    // Now auto-reconnects with exponential backoff (2s → 4s → 8s... max 30s)
    // and stops after MAX_RECONNECT attempts to avoid infinite loops
    this.imap.once('end', () => {
      this.isConnected = false;

      if (this.reconnectAttempts < this.MAX_RECONNECT) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        logger.warn(
          `[${this.accountName}] IMAP connection ended. Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT})...`
        );
        setTimeout(() => {
          // ✅ ADDED: must recreate imap instance — imap.js does not allow reuse after end
          this.imap = new Imap(this.imapConfig);
          this.connectAndListen();
        }, delay);
      } else {
        logger.error(
          `[${this.accountName}] Max reconnect attempts (${this.MAX_RECONNECT}) reached. Manual intervention needed.`
        );
      }
    });

    this.imap.connect();
  }

  public disconnect() {
    if (this.isConnected) {
      this.imap.end();
    }
  }

  private openInbox(cb: (err: Error | null, box: Imap.Box) => void) {
    this.imap.openBox('INBOX', true, cb);
  }

  private fetchRecentEmails(folderName: string) {
    if (!this.isConnected) {
      logger.warn(`[${this.accountName}] Not connected, skipping fetch`);
      return;
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 7);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sinceStr = `${sinceDate.getDate()}-${months[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;

    this.imap.search([['SINCE', sinceStr]], (err, results) => {
      if (err) {
        logger.error(`[${this.accountName}] IMAP search error:`, err.message);
        return;
      }

      if (!results || results.length === 0) {
        logger.info(`[${this.accountName}] No emails found since ${sinceStr} in ${folderName}`);
        return;
      }

      logger.info(`[${this.accountName}] Fetching ${results.length} emails from ${folderName}...`);

      const f = this.imap.fetch(results, { bodies: '' });
      const currentUserId = this.userId;
      const currentAccountName = this.accountName;
      const currentLoginEmail = this.loginEmail;

      f.on('message', (msg) => {
        msg.on('body', async (stream: any) => {
          try {
            const parsed: ParsedMail = await simpleParser(stream as Readable);

            let msgId: string | undefined;
            try {
              const rawId = parsed.messageId || parsed.headers?.get?.('message-id');
              msgId = typeof rawId === 'string' ? rawId.trim() : (Array.isArray(rawId) ? rawId.join(', ') : String(rawId || '')).trim();
              if (!msgId || msgId === 'undefined') msgId = undefined;
            } catch {
              msgId = undefined;
            }

            const dedupeKey = msgId || `${(parsed.subject || '').slice(0, 200)}|${addressToString(parsed.from)}|${String(parsed.date || '')}`;

            if (dedupeKey && processedMessageIds.has(dedupeKey)) return;

            const exists = await isEmailIndexed(
              msgId,
              currentLoginEmail,
              parsed.subject,
              parsed.date
            );

            if (exists) {
              if (dedupeKey) processedMessageIds.add(dedupeKey);
              return;
            }

            const email: Email = {
              from: addressToString(parsed.from),
              to: addressToString(parsed.to),
              subject: parsed.subject || '',
              date: parsed.date || new Date(),
              body: parsed.html || parsed.text || '',
              account: currentAccountName,
              accountEmail: currentLoginEmail,
              folder: folderName,
              messageId: msgId,
            };

            processedMessageIds.add(dedupeKey);
            EMAIL_PROCESSING_QUEUE.push({ email, retries: 0, userId: currentUserId });

            processEmailQueue().catch((err) =>
              logger.error(`[${currentAccountName}] Queue processor error:`, err)
            );
          } catch (error) {
            logger.error(`[${currentAccountName}] Error parsing message:`, error);
          }
        });
      });

      f.once('error', (err: Error) => {
        logger.error(`[${this.accountName}] Fetch error:`, err.message);
      });

      f.once('end', () => {
        logger.info(`[${this.accountName}] Fetch completed. Queue size: ${EMAIL_PROCESSING_QUEUE.length}`);
      });
    });
  }
}

setInterval(() => {
  if (EMAIL_PROCESSING_QUEUE.length > 10) {
    logger.info(`[Email Processing Queue] ${EMAIL_PROCESSING_QUEUE.length} emails waiting`);
  }
}, 15000);