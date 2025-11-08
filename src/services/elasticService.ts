// src/services/elasticService.ts
import { Client } from '@elastic/elasticsearch';
import 'dotenv/config';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'emails';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const clientConfig: any = {
  node: ELASTICSEARCH_URL,
  maxRetries: 3,
  requestTimeout: 30000,
};

// API key auth
if (process.env.ELASTICSEARCH_APIKEY) {
  clientConfig.auth = { apiKey: process.env.ELASTICSEARCH_APIKEY };
} else if (process.env.ELASTICSEARCH_USERNAME || process.env.ELASTICSEARCH_PASSWORD) {
  clientConfig.auth = {
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  };
}

export const esClient = new Client(clientConfig);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElasticsearch(retries = MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await esClient.ping();
      console.log(`Elasticsearch connected: ${ELASTICSEARCH_URL}\n`);
      return true;
    } catch (error: any) {
      const attemptsLeft = retries - i - 1;
      if (attemptsLeft > 0) {
        console.log(
          `Waiting for Elasticsearch... (attempt ${i + 1}/${retries}, ` +
          `retrying in ${RETRY_DELAY_MS / 1000}s)`
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('Elasticsearch connection failed after all retries');
        console.error('Make sure Elasticsearch is running at:', ELASTICSEARCH_URL);
        console.error('Run: docker-compose up -d');
        return false;
      }
    }
  }
  return false;
}

async function initializeElasticsearch() {
  const connected = await waitForElasticsearch();
  if (!connected) {
    console.warn('Elasticsearch not available - indexing will fail');
    return;
  }

  try {
    const indexExistsResult = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
    const indexExists = typeof indexExistsResult === 'boolean' ? indexExistsResult : (indexExistsResult as any).body;

    if (!indexExists) {
      console.log(`Creating index: ${ELASTICSEARCH_INDEX}`);
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            index: {
              max_result_window: 10000
            }
          },
          mappings: {
            properties: {
              from: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              to: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              subject: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              body: {
                type: 'text',
                analyzer: 'standard'
              },
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
      console.log(`Index created: ${ELASTICSEARCH_INDEX}`);
    }

  } catch (error: any) {
    console.error('Elasticsearch initialization error:', error?.message || error);
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

export const indexEmail = async (email: any): Promise<boolean> => {
  try {
    if (!email.subject && !email.body) {
      console.warn('[Elasticsearch] Skipping email with no subject or body');
      return false;
    }

    const midRaw = (email.messageId || '').toString();
    const messageIdClean = midRaw.replace(/[<>]/g, '');

   const document = {
  from: email.from || '',
  to: email.to || '',
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
 
    const docId = makeEsId(email);

    const response = await esClient.index({
    index: ELASTICSEARCH_INDEX,
    id: docId,
    body: document,
    });
  
    const result = (response as any).result || ((response as any).body && (response as any).body.result);

    if (result === 'created' || result === 'updated' || result === 'created') {
      return true;
    }
    
    return true;

  } catch (error: any) {
    if (error?.meta?.statusCode === 409) {
      console.log('[Elasticsearch] Document already indexed (duplicate)');
      return true;
    }

    if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('ENOTFOUND')) {
      console.error('[Elasticsearch] Connection error - is Elasticsearch running?');
      console.error('   Try: docker-compose up -d');
    } else if (error?.message?.includes('index_not_found_exception')) {
      console.error('[Elasticsearch] Index not found - reinitializing...');
      initializeElasticsearch().catch(() => {});
    } else if (error?.meta?.body?.error) {
      console.error('[Elasticsearch] Error:', error.meta.body.error.type, '-', error.meta.body.error.reason);
    } else {
      console.error('[Elasticsearch] Indexing error:', error?.message || error);
    }

    throw error;
  }
};

// Search emails
export const searchEmails = async (query: any, options: any = {}) => {
  try {
    return await esClient.search({
      index: ELASTICSEARCH_INDEX,
      ...options,
      body: query,
    });
  } catch (error: any) {
    console.error('[Elasticsearch] Search error:', error?.message || error);
    throw error;
  }
};

// Health check
export const checkElasticsearchHealth = async (): Promise<{
  connected: boolean;
  status?: string;
  nodeCount?: number;
}> => {
  try {
    await esClient.ping();
    const health = await esClient.cluster.health();
    const body = (health as any).body || health;
    return {
      connected: true,
      status: body.status,
      nodeCount: body.number_of_nodes,
    };
  } catch (error) {
    return { connected: false };
  }
};

// Get index stats
export const getIndexStats = async () => {
  try {
    const stats = await esClient.indices.stats({ index: ELASTICSEARCH_INDEX });
    const count = await esClient.count({ index: ELASTICSEARCH_INDEX });
    const statsBody = (stats as any).body || stats;
    const countBody = (count as any).body || count;
    return {
      exists: true,
      documentCount: countBody.count || 0,
      sizeInBytes: statsBody._all?.primaries?.store?.size_in_bytes || 0,
    };
  } catch (error) {
    return { exists: false, documentCount: 0, sizeInBytes: 0 };
  }
};

// Document fetch by ES id
export const fetchByEsId = async (esId: string): Promise<any | null> => {
  if (!esId) return null;
  try {
    const resp = await esClient.get({ index: ELASTICSEARCH_INDEX, id: esId });
    const body = (resp as any).body || resp;
    if (body && body._source) {
      return { _id: body._id, ...body._source };
    }
    if ((resp as any)._source) {
      return { _id: (resp as any)._id, ...(resp as any)._source };
    }
    return null;
  } catch (err: any) {
    if (err?.meta?.statusCode === 404 || (err?.body && err.body.result === 'not_found')) return null;
    throw err;
  }
};

// Document fetch by Message-ID
export const fetchByMessageId = async (messageId: string): Promise<any | null> => {
  if (!messageId) return null;
  const cleanMid = messageId.toString().trim().replace(/[<>]/g, '');
  try {
    const resp = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      body: {
        size: 1,
        query: {
          term: {
            "messageId": cleanMid
          }
        }
      }
    });
    const body = (resp as any).body || resp;
    const hits = body.hits?.hits || [];
    if (hits.length === 0) return null;
    const h = hits[0];
    return { _id: h._id, ...h._source };
  } catch (err) {
    throw err;
  }
};

// Other fetch by any id strategy
export const fetchEmailByAnyId = async (inputId: string, accountEmailHint?: string): Promise<any | null> => {
  if (!inputId) return null;

  // Direct ES id
  const direct = await fetchByEsId(inputId);
  if (direct) return direct;

  // If input looks like a messageId try search
  if (inputId.includes('@') || inputId.includes('<') || inputId.includes('>')) {
    const byMsg = await fetchByMessageId(inputId);
    if (byMsg) return byMsg;
  }

  // Construct deterministic id
  const account = accountEmailHint || 'unknown';
  const detId = makeEsId({ accountEmail: account, messageId: inputId });
  const byDet = await fetchByEsId(detId);
  if (byDet) return byDet;

  // Last attempt launch fallback id
  const fallbackDet = makeEsId({ accountEmail: 'unknown', messageId: inputId });
  const byFallback = await fetchByEsId(fallbackDet);
  if (byFallback) return byFallback;

  return null;
};
