import logger from '../utils/logger';
import { Client } from '@elastic/elasticsearch';

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ES_INDEX = process.env.ELASTICSEARCH_INDEX || 'emails';
const ES_APIKEY = process.env.ELASTICSEARCH_APIKEY || process.env.ELASTICSEARCH_API_KEY;

// CHANGED: default is now 'false' for production performance.
// 'wait_for' refresh blocks the index call until the doc is visible in search —
// fine for debugging but adds ~1s latency per email in production.
// Set ES_DEBUG_REFRESH=true in .env only when debugging locally.
const ES_DEBUG_REFRESH = (process.env.ES_DEBUG_REFRESH || 'false') === 'true';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export const esClient = new Client({
  node: ES_URL,
  auth: { apiKey: ES_APIKEY as string },
  maxRetries: 3,
  requestTimeout: 30000,
});

const es = esClient as any;

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function waitForElasticsearch(retries = MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await es.ping();
      logger.info(`[Elastic] connected -> ${ES_URL}`);
      return true;
    } catch (err: any) {
      const attemptsLeft = retries - i - 1;
      const statusCode = err?.meta?.statusCode;
      const responseBody = err?.meta?.body ? JSON.stringify(err.meta.body) : 'No body';
      const message = err?.message || err;
      logger.warn(`[Elastic] ping failed (attempt ${i + 1}/${retries}): ${message}`);
      if (statusCode) logger.warn(`[Elastic] Status Code: ${statusCode} | Body: ${responseBody}`);
      if (attemptsLeft > 0) await sleep(RETRY_DELAY_MS);
      else {
        logger.error('[Elastic] connection failed after retries; check ELASTICSEARCH_URL and credentials');
        return false;
      }
    }
  }
  return false;
}

async function initializeElasticsearch() {
  const connected = await waitForElasticsearch();
  if (!connected) return;

  try {
    const exists = await es.indices.exists({ index: ES_INDEX });
    if (!exists) {
      logger.info('[Elastic] creating index:', ES_INDEX);
      await es.indices.create({
        index: ES_INDEX,
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            from: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            from_address: { type: 'keyword' },
            to: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            to_address: { type: 'keyword' },
            subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            body: { type: 'text' },
            bodyHtml: { type: 'text' },
            date: { type: 'date' },
            account: { type: 'keyword' },
            accountEmail: { type: 'keyword' },
            folder: { type: 'keyword' },
            category: { type: 'keyword' },
            messageId: { type: 'keyword' },
            messageIdClean: { type: 'keyword' },
          },
        },
      });
      logger.info('[Elastic] index created:', ES_INDEX);
    } else {
      logger.info('[Elastic] index already exists:', ES_INDEX);
    }
  } catch (err: any) {
    logger.error('[Elastic] initialize error:', err?.message || err);
  }
}
initializeElasticsearch();

function makeEsId(email: any) {
  const mid = (email.messageId || '').toString().trim();
  const cleanMid = mid.replace(/[<>]/g, '');
  const account = (email.accountEmail || email.account || 'unknown').toString().toLowerCase();
  if (!cleanMid) {
    return `fallback-${account}-${Buffer.from(`${email.subject || ''}|${email.date || ''}`).toString('base64')}`;
  }
  return `${account}:${cleanMid}`;
}

function formatEmailAddressField(value: any): { pretty: string; address: string } {
  if (!value) return { pretty: '', address: '' };

  if (typeof value === 'string') {
    const addrMatch = value.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    return { pretty: value, address: addrMatch ? addrMatch[1] : '' };
  }

  if (Array.isArray(value)) {
    const parts = value.map(v => formatEmailAddressField(v));
    return {
      pretty: parts.map(p => p.pretty || p.address).filter(Boolean).join(', '),
      address: parts.map(p => p.address).filter(Boolean).join(', '),
    };
  }

  if (typeof value === 'object') {
    const addr = value.address || value.email || value.value || value.addr || '';
    const name = value.name || value.displayName || value.personal || '';
    const address = typeof addr === 'string' ? addr : '';
    const pretty = name ? `${name} <${address}>` : address || JSON.stringify(value);
    return { pretty: String(pretty), address: address || '' };
  }

  return { pretty: String(value), address: '' };
}

export const indexEmail = async (email: any, { useId = true } = {}): Promise<boolean> => {
  let attempt = 0;
  const maxAttempt = 2;

  while (attempt < maxAttempt) {
    try {
      if (!email.subject && !email.body && !email.text && !email.html) {
        logger.warn('[Elastic] skipping empty email');
        return false;
      }

      const midRaw = (email.messageId || '').toString();
      const messageIdClean = midRaw.replace(/[<>]/g, '');
      const fromInfo = formatEmailAddressField(email.from);
      const toInfo = formatEmailAddressField(email.to);

      const doc = {
        from: fromInfo.pretty,
        from_address: fromInfo.address,
        to: toInfo.pretty,
        to_address: toInfo.address,
        subject: email.subject || '',
        body: email.text || email.body || '',
        bodyHtml: email.html || email.bodyHtml || '',
        date: email.date || new Date(),
        account: email.account || '',
        accountEmail: email.accountEmail || '',
        folder: email.folder || 'INBOX',
        category: email.category || 'Not Interested',
        messageId: messageIdClean || undefined,
        messageIdClean: messageIdClean || undefined,
      };

      const id = useId ? makeEsId(email) : undefined;
      logger.info('[Elastic] indexing', { index: ES_INDEX, id: id || '(auto-generated)', subject: (doc.subject || '').slice(0, 120) });

      const resp = await es.index({
        index: ES_INDEX,
        ...(id ? { id } : {}),
        document: doc,
        ...(ES_DEBUG_REFRESH ? { refresh: 'wait_for' } : {}),
      });

      logger.info('[Elastic] index response:', JSON.stringify(resp));
      return true;

    } catch (err: any) {
      attempt++;
      logger.error('[Elastic] indexing error:', err?.message || err);

      const isDocParse = err?.meta?.body?.error?.type === 'document_parsing_exception'
        || (err?.message && /document_parsing_exception/i.test(err.message));

      if (isDocParse && attempt < maxAttempt) {
        logger.warn('[Elastic] auto-heal: deleting and recreating index');
        try {
          await es.indices.delete({ index: ES_INDEX }).catch((e: any) => {
            logger.warn('[Elastic] delete index failed (ignored):', e?.message || e);
          });
          await initializeElasticsearch();
          continue;
        } catch (healErr: any) {
          logger.error('[Elastic] auto-heal failed:', healErr?.message || healErr);
          break;
        }
      }

      if (err?.meta?.statusCode === 409) {
        logger.info('[Elastic] duplicate (409) -> ok');
        return true;
      }

      if (attempt >= maxAttempt) throw err;
    }
  }

  return false;
};

export const deleteEmailsByAccount = async (accountEmail: string): Promise<boolean> => {
  try {
    logger.info(`[Elastic] deleting emails for account: ${accountEmail}`);
    await esClient.deleteByQuery({
      index: ES_INDEX,
      query: { term: { accountEmail } },
      refresh: true,
    });
    return true;
  } catch (err: any) {
    logger.error('[Elastic] deleteEmailsByAccount error:', err?.message || err);
    throw err;
  }
};

export const searchEmails = async (query: any, options: any = {}) => {
  try {
    return await es.search({ index: ES_INDEX, ...options, ...query });
  } catch (err: any) {
    logger.error('[Elastic] search error:', err?.message || err);
    throw err;
  }
};

export const checkElasticsearchHealth = async () => {
  try {
    await es.ping();
    const health = await es.cluster.health();
    return { connected: true, status: health.status, nodeCount: health.number_of_nodes };
  } catch {
    return { connected: false };
  }
};

export const getIndexStats = async () => {
  try {
    const stats = await es.indices.stats({ index: ES_INDEX });
    const cnt = await es.count({ index: ES_INDEX });
    return {
      exists: true,
      documentCount: cnt.count || 0,
      sizeInBytes: stats._all?.primaries?.store?.size_in_bytes || 0,
    };
  } catch {
    return { exists: false, documentCount: 0, sizeInBytes: 0 };
  }
};

export const fetchByEsId = async (esId: string): Promise<Record<string, any> | null> => {
  try {
    const resp = await es.get({ index: ES_INDEX, id: esId });
    return { _id: resp._id, ...(resp._source as Record<string, any>) };
  } catch (err: any) {
    if (err?.meta?.statusCode === 404) return null;
    throw err;
  }
};

export const fetchByMessageId = async (messageId: string): Promise<Record<string, any> | null> => {
  if (!messageId) return null;
  const cleanMid = messageId.toString().trim().replace(/[<>]/g, '');
  const resp = await es.search({
    index: ES_INDEX,
    size: 1,
    query: { term: { messageId: cleanMid } },
  });
  const hits = resp.hits?.hits || [];
  if (hits.length === 0) return null;
  const h = hits[0];
  return { _id: h._id, ...(h._source as Record<string, any>) };
};

export const fetchEmailByAnyId = async (inputId: string, accountEmailHint?: string): Promise<Record<string, any> | null> => {
  if (!inputId) return null;
  const direct = await fetchByEsId(inputId);
  if (direct) return direct;
  if (inputId.includes('@') || inputId.includes('<') || inputId.includes('>')) {
    const byMsg = await fetchByMessageId(inputId);
    if (byMsg) return byMsg;
  }
  const account = accountEmailHint || 'unknown';
  const detId = makeEsId({ accountEmail: account, messageId: inputId });
  const byDet = await fetchByEsId(detId);
  if (byDet) return byDet;
  const fallbackDet = makeEsId({ accountEmail: 'unknown', messageId: inputId });
  const byFallback = await fetchByEsId(fallbackDet);
  if (byFallback) return byFallback;
  return null;
};

export const isEmailIndexed = async (
  messageId?: string,
  accountEmail?: string,
  subject?: string,
  date?: Date
): Promise<boolean> => {
  try {
    // 1. Try by message ID if available (most reliable)
    if (messageId) {
      const exists = await fetchByMessageId(messageId);
      if (exists) return true;
    }

    // 2. Try by deterministic ID (handles cases where messageId might be missing or different)
    const id = makeEsId({
      messageId: messageId || '',
      accountEmail: accountEmail || 'unknown',
      subject: subject || '',
      date: date || new Date()
    });

    const direct = await fetchByEsId(id);
    if (direct) return true;

    return false;
  } catch (err) {
    logger.error('[Elastic] isEmailIndexed check failed:', err);
    return false;
  }
};