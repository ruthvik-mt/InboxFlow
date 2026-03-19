import logger from '../utils/logger';
import axios from "axios";

export type Label =
  | "Interested"
  | "Meeting Booked"
  | "Not Interested"
  | "Spam"
  | "Out of Office";

export interface ClassifyResult {
  label: Label;
  confidence: number;
  explanation?: string;
}

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "";
const CEREBRAS_URL = process.env.CEREBRAS_URL || "https://api.cerebras.ai/v1/chat/completions";
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "llama3.1-8b";

const RPS = Number(process.env.CEREBRAS_RPS || "0.5");
const MAX_CONCURRENCY = Number(process.env.CEREBRAS_CONCURRENCY || "1");
const MAX_RETRIES = Number(process.env.CEREBRAS_MAX_RETRIES || "3");
const BASE_BACKOFF_MS = Number(process.env.CEREBRAS_BACKOFF_MS || "3000");
const JITTER_MS = Number(process.env.CEREBRAS_JITTER_MS || "1000");
const REQUEST_TIMEOUT_MS = Number(process.env.CEREBRAS_TIMEOUT_MS || "30000");
const MAX_EMAIL_CHARS = Number(process.env.CEREBRAS_MAX_EMAIL_CHARS || "4000");

if (!CEREBRAS_API_KEY) {
  logger.warn("CEREBRAS_API_KEY not set.");
}

const CANDIDATE_LABELS: Label[] = [
  "Interested",
  "Meeting Booked",
  "Not Interested",
  "Spam",
  "Out of Office",
];

// Only match exact label strings returned by AI
// Case-insensitive label parsing
function parseLabel(raw: string): Label {
  const s = raw.trim().toLowerCase();
  if (s.includes("meeting booked")) return "Meeting Booked";
  if (s.includes("out of office")) return "Out of Office";
  if (s.includes("spam")) return "Spam";
  if (s.includes("interested") && !s.includes("not interested")) return "Interested";
  if (s.includes("not interested")) return "Not Interested";

  // Fuzzy matching for various labels
  if (s.includes("schedule") || s.includes("calendar") || s.includes("zoom")) return "Meeting Booked";
  if (s.includes("vacation") || s.includes("away")) return "Out of Office";
  if (s.includes("scam") || s.includes("phish")) return "Spam";

  return "Not Interested";
}

// Rule-based pre-filter — runs BEFORE AI to catch obvious cases
// Rule-based pre-filter — runs BEFORE AI to catch CERTAIN automatic replies
function ruleBasedClassify(subject: string, body: string): Label | null {
  const s = (subject + " " + body).toLowerCase();

  // Out of office — very specific patterns
  if (/i am out of office|i (am|'m) away|i will be out|on vacation|on leave|i'll be back|automatic reply/i.test(s)) {
    return "Out of Office";
  }

  // Spam — phishing/scam patterns
  if (/you've won|click here to claim|verify your account urgently|nigerian prince|wire transfer|urgent action required/i.test(s)) {
    return "Spam";
  }

  // Not Interested — only for very clear newsletters/automated alerts
  if (
    /unsubscribe|newsletter|no-reply|noreply/.test(s) &&
    (s.includes("weekly") || s.includes("monthly") || s.includes("digest"))
  ) {
    return "Not Interested";
  }

  return null; // Let AI decide for more nuanced cases
}

export async function categorizeEmailRaw(subject: string, body: string): Promise<ClassifyResult> {
  if (!CEREBRAS_API_KEY) {
    throw new Error("Missing CEREBRAS_API_KEY");
  }

  // Run rule-based first
  const ruleResult = ruleBasedClassify(subject, body);
  if (ruleResult) {
    logger.info(`[AI] Rule-based classification: ${ruleResult} for "${subject.slice(0, 50)}"`);
    return { label: ruleResult, confidence: 0.95, explanation: "Classified by rules" };
  }

  const truncatedSubject = (subject ?? "").slice(0, 300);
  const truncatedBody = (body ?? "").slice(0, MAX_EMAIL_CHARS);
  const wasTruncated = (body?.length || 0) > MAX_EMAIL_CHARS;
  const text = `Subject: ${truncatedSubject}\n\n${truncatedBody}`.trim();

  const prompt = `You are an expert email classifier analyzing professional communication.
Classify the following email into exactly ONE category based on its true intent.

CATEGORIES & CRITERIA:
1. "Interested": A person (not a bot) expressing actual interest in your business, service, or profile. They might ask questions, express excitement, or invite you to apply further.
2. "Meeting Booked": Any message suggesting, asking for, or confirming a specific time/date for a call, meeting, or demo.
3. "Out of Office": Automated "Away" or "Vacation" messages.
4. "Spam": Phishing, clear scams, or completely unrelated bulk junk mail.
5. "Not Interested": Newsletters, automated product updates, cold marketing emails you didn't ask for, or people saying they are not interested.

INSTRUCTIONS:
- Analyze the sender's goal.
- Be precise. If they want to talk/meet, use "Meeting Booked". If they like what you do, use "Interested".
- Respond with JSON only:
{"label":"Label Name","confidence":0.95,"explanation":"Reason for this label"}

Email Content${wasTruncated ? " (truncated)" : ""}:
"""
${text}
"""`;

  const resp = await axios.post(CEREBRAS_URL, {
    model: CEREBRAS_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  }, {
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: REQUEST_TIMEOUT_MS,
    validateStatus: () => true,
  });

  if (resp.status < 200 || resp.status >= 300) {
    const err: any = new Error(`Cerebras HTTP ${resp.status}: ${JSON.stringify(resp.data)}`);
    err.response = resp;
    throw err;
  }

  const content = (resp.data?.choices?.[0]?.message?.content ?? "").trim();

  try {
    // Strip markdown code blocks if present
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const label = parseLabel(String(parsed.label ?? ""));
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.8));
    const explanation = String(parsed.explanation ?? "");

    return { label, confidence, explanation };
  } catch {
    // Fallback: extract label from raw text
    const match = content.match(/\b(Interested|Meeting Booked|Not Interested|Spam|Out of Office)\b/);
    const label = match ? parseLabel(match[0]) : "Not Interested";
    return { label, confidence: 0.5, explanation: content.slice(0, 200) };
  }
}

type QueueItem = {
  subject: string;
  body: string;
  resolve: (r: ClassifyResult) => void;
  reject: (e: Error | unknown) => void;
  attempts: number;
  enqueuedAt: number;
};

const QUEUE: QueueItem[] = [];
let running = 0;
let lastRequestTime = 0;
let consecutiveRateLimits = 0;
let dynamicDelayMs = 0;

const minIntervalMs = Math.ceil(1000 / RPS);

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function processOne(item: QueueItem): Promise<ClassifyResult> {
  let lastErr: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await categorizeEmailRaw(item.subject, item.body);
      consecutiveRateLimits = 0;
      dynamicDelayMs = Math.max(0, dynamicDelayMs - 1000);
      return res;
    } catch (err: unknown) {
      const axiosErr = err as any;
      const status = axiosErr?.response?.status ?? axiosErr?.status ?? null;
      const bodyMsg = String(axiosErr?.response?.data?.message ?? axiosErr?.message ?? axiosErr);

      const isRate =
        status === 429 ||
        /too[_\s-]*many[_\s-]*requests|request_quota_exceeded|quota|rate limit/i.test(bodyMsg);

      const isContextError =
        status === 400 &&
        /context_length_exceeded|reduce the length/i.test(bodyMsg);

      if (isContextError) {
        return { label: "Not Interested", confidence: 0.5, explanation: "Email too long to classify" };
      }

      if (isRate) {
        consecutiveRateLimits++;
        dynamicDelayMs = Math.min(60000, dynamicDelayMs + 5000);
        logger.warn(`[Cerebras] Rate limit hit (${consecutiveRateLimits}x consecutive), adding ${dynamicDelayMs}ms delay`);
      }

      if (attempt >= MAX_RETRIES) {
        logger.error(`[Cerebras] Max retries (${MAX_RETRIES}) exceeded for: ${item.subject.substring(0, 50)}...`);
        break;
      }

      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * JITTER_MS);
      const totalDelay = backoff + dynamicDelayMs;
      logger.info(`[Cerebras] Retry ${attempt + 1}/${MAX_RETRIES} after ${totalDelay}ms (rate limited: ${isRate})`);
      await sleep(totalDelay);
    }
  }

  throw lastErr ?? new Error("categorizeEmail: unknown error after all retries");
}

async function workerTick() {
  if (running >= MAX_CONCURRENCY) return;

  const item = QUEUE.shift();
  if (!item) return;

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const requiredWait = minIntervalMs + dynamicDelayMs;

  if (timeSinceLastRequest < requiredWait) {
    const waitTime = requiredWait - timeSinceLastRequest;
    QUEUE.unshift(item);
    await sleep(waitTime);
    return;
  }

  lastRequestTime = Date.now();
  running++;

  try {
    const result = await processOne(item);
    item.resolve(result);
  } catch (e) {
    item.reject(e);
  } finally {
    running--;
  }
}

let workerRunning = false;
async function startWorker() {
  if (workerRunning) return;
  workerRunning = true;
  while (true) {
    await workerTick();
    await sleep(Math.max(100, minIntervalMs / 2));
  }
}

startWorker();

setInterval(() => {
  if (QUEUE.length > 5) {
    logger.info(`[Cerebras Queue] ${QUEUE.length} pending, ${running} running, delay: ${dynamicDelayMs}ms`);
  }
}, 10000);

export function categorizeEmail(subject: string, body: string): Promise<ClassifyResult> {
  return new Promise((resolve, reject) => {
    QUEUE.push({ subject, body, resolve, reject, attempts: 0, enqueuedAt: Date.now() });
  });
}

export function getAiQueueLength() {
  return QUEUE.length;
}

export function getAiQueueStats() {
  return { queueLength: QUEUE.length, running, dynamicDelayMs, consecutiveRateLimits };
}