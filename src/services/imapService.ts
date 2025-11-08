// src/services/imapService.ts
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { indexEmail } from './elasticService';
import { categorizeEmail } from './aiService';
import { notifySlack, triggerWebhook } from './notificationService';
import { Readable } from 'stream';

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

// Queue
const EMAIL_PROCESSING_QUEUE: Array<{email: Email; retries: number}> = [];
let isProcessingQueue = false;
const MAX_PROCESSING_RETRIES = 3;

function addressToString(addr: any): string {
  if (!addr) return '';
  if (Array.isArray(addr)) return addr.map(a => a?.address || a?.value || a?.text || '').filter(Boolean).join(', ');
  return addr?.address || addr?.value || addr?.text || '';
}

function normalizeCategory(raw: any): string {
  const s = String(raw || '').toLowerCase();
  if (s.includes('meeting')) return 'Meeting Booked';
  if (s.includes('out of office') || s.includes('vacation') || s.includes('oof')) return 'Out of Office';
  if (s.includes('spam')) return 'Spam';
  if (s.includes('interested')) return 'Interested';
  return 'Not Interested';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process email queue
async function processEmailQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (EMAIL_PROCESSING_QUEUE.length > 0) {
    const item = EMAIL_PROCESSING_QUEUE.shift();
    if (!item) continue;

    const { email, retries } = item;

    try {
      // AI categorization
      const classification = await categorizeEmail(email.subject || '', email.body || '');
      email.category = normalizeCategory(classification?.label ?? classification);

      // Index to Elasticsearch
      try {
        await indexEmail(email);
      } catch (indexErr) {
        console.error(`[${email.account}] Elasticsearch indexing failed:`, indexErr);
        const dedupeKey = email.messageId ||
          `${(email.subject || '').slice(0, 200)}|${email.from}|${String(email.date || '')}`;
        if (dedupeKey) processedMessageIds.delete(dedupeKey);
      }

      // Notify only for "Interested" emails
      if (email.category === 'Interested') {
        notifySlack(email).catch((e) =>
          console.error(`[${email.account}] Slack notify error:`, e)
        );
        triggerWebhook(email).catch((e) =>
          console.error(`[${email.account}] Webhook notify error:`, e)
        );
      }

      console.log(`[${email.account}] ${email.subject || '(no subject)'} | ${email.category}`);
    
      await sleep(500);

    } catch (error: any) {
      console.error(
        `[${email.account}] Error processing email (attempt ${retries + 1}/${MAX_PROCESSING_RETRIES}):`,
        error?.message || error
      );

      // Retry logic
      if (retries < MAX_PROCESSING_RETRIES - 1) {
        EMAIL_PROCESSING_QUEUE.push({ email, retries: retries + 1 });
        await sleep(2000 * (retries + 1));
      } else {
        console.error(`[${email.account}] Gave up after ${MAX_PROCESSING_RETRIES} attempts`);
        email.category = 'Not Interested';
      }
    }
  }

  isProcessingQueue = false;
}

export class ImapService {
  private imap: Imap;
  private accountName!: string;
  private loginEmail!: string;
  private isConnected: boolean = false;

  constructor(user: string, password: string, host: string, port: number, accountName: string) {
    this.accountName = accountName;
    this.loginEmail = user;
    this.imap = new Imap({
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });
  }

  public connectAndListen() {
    this.imap.once('ready', () => {
      this.isConnected = true;
      this.openInbox((err, box) => {
        if (err) {
          console.error(`[${this.accountName}] Failed to open inbox:`, err);
          return;
        }
        console.log(`[${this.accountName}] IMAP connected. Total messages: ${box.messages.total}`);
        this.fetchRecentEmails();

        // Listener for new emails
        this.imap.removeAllListeners('mail');
        this.imap.on('mail', () => {
          console.log(`[${this.accountName}] New mail notification received`);
          this.fetchRecentEmails();
        });
      });
    });

    this.imap.once('error', (err: Error) => {
      console.error(`[${this.accountName}] IMAP Error:`, err.message);
      this.isConnected = false;
    });

    this.imap.once('end', () => {
      console.log(`[${this.accountName}] IMAP connection ended`);
      this.isConnected = false;
    });

    this.imap.connect();
  }

  private openInbox(cb: (err: Error | null, box: Imap.Box) => void) {
    this.imap.openBox('INBOX', true, cb);
  }

  private fetchRecentEmails() {
    if (!this.isConnected) {
      console.warn(`[${this.accountName}] Not connected, skipping fetch`);
      return;
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const sinceStr = `${sinceDate.getDate()}-${months[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;

    this.imap.search([['SINCE', sinceStr]], (err, results) => {
      if (err) {
        console.error(`[${this.accountName}] IMAP search error:`, err.message);
        return;
      }

      if (!results || results.length === 0) {
        console.log(`[${this.accountName}] No emails found since ${sinceStr}`);
        return;
      }

      console.log(`[${this.accountName}] Fetching ${results.length} emails...`);

      const f = this.imap.fetch(results, { bodies: '' });

      f.on('message', (msg) => {
        msg.on('body', async (stream: any) => {
          try {
            const parsed: ParsedMail = await simpleParser(stream as Readable);

            let msgId: string | undefined;
            try {
              const rawId = parsed.messageId || parsed.headers?.get?.('message-id');
              msgId = typeof rawId === 'string'
                ? rawId.trim()
                : (Array.isArray(rawId) ? rawId.join(', ') : String(rawId || '')).trim();
              if (!msgId || msgId === 'undefined') msgId = undefined;
            } catch {
              msgId = undefined;
            }

            const dedupeKey = msgId ||
              `${(parsed.subject || '').slice(0, 200)}|${addressToString(parsed.from)}|${String(parsed.date || '')}`;

            if (dedupeKey && processedMessageIds.has(dedupeKey)) {
              return; // Skip duplicate
            }

            const email: Email = {
              from: addressToString(parsed.from),
              to: addressToString(parsed.to),
              subject: parsed.subject || '',
              date: parsed.date || new Date(),
              body: parsed.text || '',
              account: this.accountName,
              accountEmail: this.loginEmail,
              folder: 'INBOX',
              messageId: msgId,
            };

            processedMessageIds.add(dedupeKey);

            // Queue
            EMAIL_PROCESSING_QUEUE.push({ email, retries: 0 });
           
            processEmailQueue().catch(err =>
              console.error(`[${this.accountName}] Queue processor error:`, err)
            );

          } catch (error) {
            console.error(`[${this.accountName}] Error parsing message:`, error);
          }
        });
      });

      f.once('error', (err: Error) => {
        console.error(`[${this.accountName}] Fetch error:`, err.message);
      });

      f.once('end', () => {
        console.log(`[${this.accountName}] Fetch completed. Queue size: ${EMAIL_PROCESSING_QUEUE.length}`);
      });
    });
  }
}

// Monitor queue size
setInterval(() => {
  if (EMAIL_PROCESSING_QUEUE.length > 10) {
    console.log(`[Email Processing Queue] ${EMAIL_PROCESSING_QUEUE.length} emails waiting`);
  }
}, 15000);