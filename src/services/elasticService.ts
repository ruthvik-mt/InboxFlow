// src/services/elasticService.ts
import { Client } from '@elastic/elasticsearch';
import 'dotenv/config';

const ES_URL = process.env.ELASTICSEARCH_URL || process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const ES_INDEX = process.env.ELASTICSEARCH_INDEX || 'emails';
const ES_APIKEY = process.env.ELASTICSEARCH_APIKEY || process.env.ELASTICSEARCH_API_KEY;
const ES_DEBUG_REFRESH = (process.env.ES_DEBUG_REFRESH || 'true') === 'true'; // set false for production
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const clientOptions: any = {
  node: ES_URL,
  maxRetries: 3,
  requestTimeout: 30000,
};

// If API key present, use it (works for Elastic Cloud)
if (ES_APIKEY) {
  clientOptions.auth = { apiKey: ES_APIKEY };
}

export const esClient = new Client(clientOptions);

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function waitForElasticsearch(retries = MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await esClient.ping();
      console.log(`[es] connected -> ${ES_URL}`);
      return true;
    } catch (err: any) {
      const attemptsLeft = retries - i - 1;
      console.warn(`[es] ping failed (attempt ${i + 1}/${retries}): ${err?.message || err}`);
      if (attemptsLeft > 0) {
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('[es] connection failed after retries; check ELASTICSEARCH_URL and credentials');
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
    const existsResp = await esClient.indices.exists({ index: ES_INDEX });
    const exists = typeof existsResp === 'boolean' ? existsResp : (existsResp as any).body;
    if (!exists) {
      console.log('[es] creating index:', ES_INDEX);
      await esClient.indices.create({
        index: ES_INDEX,
        body: {
          settings: { number_of_shards: 1, number_of_replicas: 0 },
          mappings: {
            properties: {
              from: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              from_address: { type: 'keyword' },
              to: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              to_address: { type: 'keyword' },
              subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              body: { type: 'text' },
              date: { type: 'date' },
              account: { type: 'keyword' },
              accountEmail: { type: 'keyword' },
              folder: { type: 'keyword' },
              category: { type: 'keyword' },
              messageId: { type: 'keyword' },
              messageIdClean: { type: 'keyword' }
            }
          }
        }
      });
      console.log('[es] index created:', ES_INDEX);
    } else {
      console.log('[es] index already exists:', ES_INDEX);
    }
  } catch (err: any) {
    console.error('[es] initialize error:', err?.message || err, err?.meta?.body ?? '');
  }
}
initializeElasticsearch();

// deterministic id helper (keeps same logic you had)
function makeEsId(email: any) {
  const mid = (email.messageId || '').toString().trim();
  const cleanMid = mid.replace(/[<>]/g, '');
  const account = (email.accountEmail || email.account || 'unknown').toString().toLowerCase();
  if (!cleanMid) {
    return `fallback-${account}-${Buffer.from(`${email.subject || ''}|${email.date || ''}`).toString('base64')}`;
  }
  return `${account}:${cleanMid}`;
}

/**
 * Helper: take mailparser / imap `from` or `to` value (string | object | array)
 * and return pretty string + raw address for indexing.
 */
function formatEmailAddressField(value: any): { pretty: string; address: string } {
  if (!value) return { pretty: '', address: '' };

  // If already a string, try to extract the email address
  if (typeof value === 'string') {
    const addrMatch = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return { pretty: value, address: addrMatch ? addrMatch[1] : '' };
  }

  // If array, map each and join
  if (Array.isArray(value)) {
    const parts = value.map(v => formatEmailAddressField(v));
    return {
      pretty: parts.map(p => p.pretty || p.address).filter(Boolean).join(', '),
      address: parts.map(p => p.address).filter(Boolean).join(', ')
    };
  }

  // If object (mailparser often gives { address, name } or { value: ... })
  if (typeof value === 'object') {
    // mailparser sometimes provides { value: [ { address, name } ] }
    if (Array.isArray(value.value)) {
      const parts = value.value.map((v: any) => formatEmailAddressField(v));
      return {
        pretty: parts.map((p: any) => p.pretty || p.address).filter(Boolean).join(', '),
        address: parts.map((p: any) => p.address).filter(Boolean).join(', ')
      };
    }

    const addr = value.address || value.value || value.addr || '';
    const name = value.name || value.displayName || value.personal || '';
    const address = typeof addr === 'string' ? addr : '';
    const pretty = name ? `${name} <${address}>` : (address || JSON.stringify(value));
    return { pretty: String(pretty), address: address || '' };
  }

  // Fallback
  return { pretty: String(value), address: '' };
}

export const indexEmail = async (email: any, { useId = true } = {}): Promise<boolean> => {
  try {
    if (!email.subject && !email.body && !email.text && !email.html) {
      console.warn('[es] skipping empty email');
      return false;
    }

    const midRaw = (email.messageId || '').toString();
    const messageIdClean = midRaw.replace(/[<>]/g, '');

    // Normalize from/to into plain strings + raw addresses
    const fromInfo = formatEmailAddressField(email.from);
    const toInfo = formatEmailAddressField(email.to);

    const doc = {
      from: fromInfo.pretty || '',
      from_address: fromInfo.address || '',
      to: toInfo.pretty || '',
      to_address: toInfo.address || '',
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
    console.log('[es] indexing', { index: ES_INDEX, id: id ? id : '(auto-generated)', subject: (doc.subject || '').slice(0, 120) });

    const resp = await esClient.index({
      index: ES_INDEX,
      ...(id ? { id } : {}),
      body: doc,
      ...(ES_DEBUG_REFRESH ? { refresh: 'wait_for' } : {}),
    });

    const body = (resp as any).body || resp;
    console.log('[es] index response:', JSON.stringify(body));
    return true;
  } catch (err: any) {
    console.error('[es] indexing error (full):', err);
    if (err?.meta?.body) {
      console.error('[es] meta.body:', JSON.stringify(err.meta.body));
    }
    if (err?.meta?.statusCode === 409) {
      console.log('[es] duplicate (409) -> ok');
      return true;
    }
    throw err;
  }
};

export const searchEmails = async (query: any, options: any = {}) => {
  try {
    return await esClient.search({ index: ES_INDEX, ...options, body: query });
  } catch (err: any) {
    console.error('[es] search error:', err?.message || err);
    throw err;
  }
};

export const checkElasticsearchHealth = async () => {
  try {
    await esClient.ping();
    const health = await esClient.cluster.health();
    const b = (health as any).body || health;
    return { connected: true, status: b.status, nodeCount: b.number_of_nodes };
  } catch (err) {
    return { connected: false };
  }
};

export const getIndexStats = async () => {
  try {
    const stats = await esClient.indices.stats({ index: ES_INDEX });
    const cnt = await esClient.count({ index: ES_INDEX });
    const statsBody = (stats as any).body || stats;
    const countBody = (cnt as any).body || cnt;
    return { exists: true, documentCount: countBody.count || 0, sizeInBytes: statsBody._all?.primaries?.store?.size_in_bytes || 0 };
  } catch (err) {
    return { exists: false, documentCount: 0, sizeInBytes: 0 };
  }
};

export const fetchByEsId = async (esId: string) => {
  try {
    const resp = await esClient.get({ index: ES_INDEX, id: esId });
    const b = (resp as any).body || resp;
    return { _id: b._id, ...b._source };
  } catch (err: any) {
    if (err?.meta?.statusCode === 404) return null;
    throw err;
  }
};

export const fetchByMessageId = async (messageId: string) => {
  if (!messageId) return null;
  const cleanMid = messageId.toString().trim().replace(/[<>]/g, '');
  const resp = await esClient.search({
    index: ES_INDEX,
    body: { size: 1, query: { term: { messageId: cleanMid } } }
  });
  const b = (resp as any).body || resp;
  const hits = b.hits?.hits || [];
  if (hits.length === 0) return null;
  const h = hits[0];
  return { _id: h._id, ...h._source };
};

export const fetchEmailByAnyId = async (inputId: string, accountEmailHint?: string) => {
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
