// src/services/aiService.ts
import "dotenv/config";
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
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "gpt-oss-120b";

// Rate limiting
const RPS = Number(process.env.CEREBRAS_RPS || "0.5");
const MAX_CONCURRENCY = Number(process.env.CEREBRAS_CONCURRENCY || "1");
const MAX_RETRIES = Number(process.env.CEREBRAS_MAX_RETRIES || "5");
const BASE_BACKOFF_MS = Number(process.env.CEREBRAS_BACKOFF_MS || "3000");
const JITTER_MS = Number(process.env.CEREBRAS_JITTER_MS || "1000");
const REQUEST_TIMEOUT_MS = Number(process.env.CEREBRAS_TIMEOUT_MS || "30000");
const MAX_EMAIL_CHARS = Number(process.env.CEREBRAS_MAX_EMAIL_CHARS || "6000");

if (!CEREBRAS_API_KEY) {
  console.warn("CEREBRAS_API_KEY not set. Set it in your .env to enable classification.");
}

const CANDIDATE_LABELS: Label[] = [
  "Interested",
  "Meeting Booked",
  "Not Interested",
  "Spam",
  "Out of Office",
];

function normalizeLabel(text: string): Label {
  const s = String(text || "").toLowerCase();
  if (s.includes("meeting")) return "Meeting Booked";
  if (s.includes("out of office") || s.includes("vacation") || s.includes("oof")) return "Out of Office";
  if (s.includes("spam")) return "Spam";
  if (s.includes("unsubscribe") || s.includes("promotion") || s.includes("promo") || s.includes("marketing")) return "Not Interested";
  if (s.includes("interested")) return "Interested";
  return "Not Interested";
}

export async function categorizeEmailRaw(subject: string, body: string): Promise<ClassifyResult> {
  if (!CEREBRAS_API_KEY) {
    throw new Error("Missing CEREBRAS_API_KEY");
  }
  
  const MAX_CHARS = MAX_EMAIL_CHARS || 6000;
  const truncatedSubject = (subject ?? "").slice(0, 500);
  const truncatedBody = (body ?? "").slice(0, MAX_CHARS);
  const wasTruncated = (body?.length || 0) > MAX_CHARS;

  const text = `${truncatedSubject}\n\n${truncatedBody}`.trim();

  // Prompt
  const prompt = `
You are an email classification assistant. Classify the email into exactly one of the following categories:
${CANDIDATE_LABELS.join(", ")}.

Rules (follow exactly):
1) Return JSON ONLY with keys: label (one of the categories), confidence (0.0-1.0), explanation (short).
   Example: {"label":"Interested","confidence":0.95,"explanation":"..."}.
2) Explanation must be a short sentence supporting the label.
3) If the email contains explicit unsubscribe, marketing, promotion links, or clear bulk-marketing signals -> prefer "Not Interested" (use "Spam" only if the email clearly looks like spam).
4) If the email asks to book or confirm a meeting/time -> use "Meeting Booked".
5) If the email mentions vacation, out of office, or OOO -> use "Out of Office".
6) Confidence should reflect certainty: 0.0 (no idea) .. 1.0 (very sure).
7) Ensure the label is consistent with the explanation. If they conflict, adjust the label to match the explanation.

Email${wasTruncated ? ' (truncated)' : ''}:
"""${text}"""
`;

  const bodyPayload = {
    model: CEREBRAS_MODEL,
    messages: [{ role: "user", content: prompt }],
  };

  const resp = await axios.post(CEREBRAS_URL, bodyPayload, {
    headers: {
      Authorization: `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: REQUEST_TIMEOUT_MS,
    validateStatus: (s) => true,
  });

  if (resp.status < 200 || resp.status >= 300) {
    const err = new Error(`Cerebras HTTP ${resp.status}: ${JSON.stringify(resp.data)}`);
    (err as any).response = resp;
    throw err;
  }

  const content = resp.data?.choices?.[0]?.message?.content ?? String(resp.data ?? "");

  // Robust parse + heuristic
  try {
    const parsed = JSON.parse(content);

    const labelRaw = String(parsed.label ?? "");
    const explanationRaw = String(parsed.explanation ?? "");
    const confidenceRaw = Number(parsed.confidence);
    const confidenceCandidate = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : undefined;

    
    let label = normalizeLabel(labelRaw || explanationRaw || content);

   
    const explanationLower = explanationRaw.toLowerCase();
    const contentLower = text.toLowerCase();

    const hasUnsubscribe = /\bunsubscribe\b/.test(explanationLower) || /\bunsubscribe\b/.test(contentLower);
    const hasPromo = /\bpromo\b|\bpromotion\b|\bmarketing\b|\bpromotional\b/.test(explanationLower) || /\bpromo\b|\bpromotion\b|\bmarketing\b|\bpromotional\b/.test(contentLower);
    const hasSpam = /\bspam\b/.test(explanationLower) || /\bspam\b/.test(contentLower);
    const hasOOO = /\bout of office\b|\bout-of-office\b|\boof\b|\bvacation\b/.test(explanationLower) || /\bout of office\b|\bout-of-office\b|\boof\b|\bvacation\b/.test(contentLower);
    const hasMeeting = /\b(schedule|book|meeting|interview|call|availability|when will)\b/.test(explanationLower) || /\b(schedule|book|meeting|interview|call|availability|when will)\b/.test(contentLower);

   
    if (hasSpam) {
      label = "Spam";
    } else if (hasUnsubscribe || hasPromo) {
      label = "Not Interested";
    } else if (hasOOO) {
      label = "Out of Office";
    } else if (hasMeeting) {
      label = "Meeting Booked";
    }

    const confidence = confidenceCandidate ?? 1;

    if (!CANDIDATE_LABELS.includes(label as Label)) {
      label = "Not Interested";
    }

    return { label: label as Label, confidence: Math.max(0, Math.min(1, confidence)), explanation: explanationRaw || content };
  } catch {
    
    const match = content.match(/\b(Interested|Meeting Booked|Not Interested|Spam|Out of Office)\b/i);
    let label = normalizeLabel(match ? match[0] : content);
    const confMatch = content.match(/([01](?:\.\d+)?|\d?\.\d+)/);
    const confidence = confMatch ? Math.max(0, Math.min(1, Number(confMatch[0]))) : 1;
 
    const contentLower = text.toLowerCase();
    if (/\bunsubscribe\b/.test(contentLower) || /\bpromo\b|\bpromotion\b|\bmarketing\b/.test(contentLower)) {
      label = "Not Interested";
    } else if (/\bspam\b/.test(contentLower)) {
      label = "Spam";
    } else if (/\bout of office\b|\boof\b|\bvacation\b/.test(contentLower)) {
      label = "Out of Office";
    } else if (/\b(schedule|book|meeting|interview|call|availability|when will)\b/.test(contentLower)) {
      label = "Meeting Booked";
    }

    return { label: label as Label, confidence, explanation: content };
  }
}

// Queue for rate limiting
type QueueItem = {
  subject: string;
  body: string;
  resolve: (r: ClassifyResult) => void;
  reject: (e: any) => void;
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
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status ?? err?.status ?? null;
      const bodyMsg = String(err?.response?.data?.message ?? err?.message ?? err);

      const isRate =
        status === 429 ||
        /too[_\s-]*many[_\s-]*requests|request_quota_exceeded|quota|rate limit/i.test(bodyMsg);
      
      const isContextError =
        status === 400 &&
        /context_length_exceeded|reduce the length/i.test(bodyMsg);

      if (isContextError) {
        console.error(
          `[Cerebras] Context length exceeded for: ${item.subject.substring(0, 50)}... ` +
          `(this email is too long, even after truncation)`
        );
        
        return {
          label: "Not Interested",
          confidence: 0.5,
          explanation: "Email too long to classify"
        };
      }

      if (isRate) {
        consecutiveRateLimits++;
        dynamicDelayMs = Math.min(60000, dynamicDelayMs + 5000);
        console.warn(
          `[Cerebras] Rate limit hit (${consecutiveRateLimits}x consecutive), ` +
          `adding ${dynamicDelayMs}ms delay`
        );
      }

      if (attempt >= MAX_RETRIES) {
        console.error(
          `[Cerebras] Max retries (${MAX_RETRIES}) exceeded for: ` +
          `${item.subject.substring(0, 50)}...`
        );
        break;
      }

      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * JITTER_MS);
      const totalDelay = backoff + dynamicDelayMs;

      console.log(
        `[Cerebras] Retry ${attempt + 1}/${MAX_RETRIES} after ${totalDelay}ms ` +
        `(rate limited: ${isRate})`
      );
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
    console.log(
      `[Cerebras Queue] ${QUEUE.length} pending, ${running} running, ` +
      `delay: ${dynamicDelayMs}ms, rate limits: ${consecutiveRateLimits}`
    );
  }
}, 10000);

export function categorizeEmail(subject: string, body: string): Promise<ClassifyResult> {
  return new Promise((resolve, reject) => {
    QUEUE.push({
      subject,
      body,
      resolve,
      reject,
      attempts: 0,
      enqueuedAt: Date.now(),
    });
  });
}

export function getAiQueueLength() {
  return QUEUE.length;
}

export function getAiQueueStats() {
  return {
    queueLength: QUEUE.length,
    running,
    dynamicDelayMs,
    consecutiveRateLimits,
  };
}
