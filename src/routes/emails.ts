// src/routes/emails.ts
import express, { Request, Response } from 'express';
import { esClient, fetchEmailByAnyId, searchEmails } from '../services/elasticService';

const router = express.Router();

function esPayload(result: any): any {
  return (result && (result.body ?? result)) || null;
}

// Emails seacrh
router.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const idParam = (req.query._id || req.query.id || '').toString();
  const account = req.query.account as string | undefined;
  const folder = req.query.folder as string | undefined;
  const label = req.query.label as string | undefined;

  try {
    if (idParam) {
      try {
        const result = await esClient.get({ index: 'emails', id: idParam });
        const payload = esPayload(result);
        if (payload?.found) {
          const source = payload._source as Record<string, any>;
          return res.json({ meta: { total: 1, size: 1 }, emails: [{ _id: payload._id, ...source }] });
        }
        return res.status(404).json({ error: 'Email not found' });
      } catch (err: any) {
        if (err?.meta?.statusCode === 404) return res.status(404).json({ error: 'Email not found' });
        console.error('>>> Elasticsearch /emails/search by ID error:', err?.message ?? err);
        throw err;
      }
    }

    const must: any[] = [];
    const filter: any[] = [];
    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['subject', 'body', 'from.address', 'to.address'],
          fuzziness: 'AUTO',
        },
      });
    }
    if (account) filter.push({ term: { 'account.keyword': account } });
    if (folder) filter.push({ term: { 'folder.keyword': folder } });
    if (label) filter.push({ term: { 'category.keyword': label } });

    const query =
      must.length === 0 && filter.length === 0
        ? { match_all: {} }
        : { bool: { ...(must.length ? { must } : {}), ...(filter.length ? { filter } : {}) } };

    const esResp = await esClient.search({ index: 'emails', body: { size: 50, sort: [{ date: { order: 'desc' } }], query } });
    const body = esPayload(esResp);
    const hits = (body?.hits?.hits || []).map((hit: any) => ({ _id: hit._id, ...hit._source }));
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? hits.length;

    return res.json({ meta: { total, size: hits.length }, emails: hits });
  } catch (err: any) {
    console.error('>>> Elasticsearch /emails/search error:', err?.meta?.body?.error ?? err?.message ?? err);
    return res.status(500).send('Error searching emails');
  }
});

// Emails  lists
router.get('/', async (req: Request, res: Response) => {
  try {
    const idParam = (req.query._id || req.query._Id || req.query.id || req.query.ID || '').toString();
    const accountHint = (req.query.accountEmail || req.query.account || '').toString() || undefined;
    if (idParam) {
      const email = await fetchEmailByAnyId(idParam, accountHint);
      if (!email) return res.status(404).json({ error: 'Email not found' });
      return res.json({ meta: { total: 1, page: 1, size: 1 }, emails: [email] });
    }

    const days = parseInt((req.query.days as string) || '30', 10);
    const size = Math.min(parseInt((req.query.size as string) || '50', 10), 1000);
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const from = (page - 1) * size;

    const esResp = await esClient.search({
      index: 'emails',
      body: {
        from,
        size,
        sort: [{ date: { order: 'desc' } }],
        query: {
          bool: {
            filter: {
              range: {
                date: { gte: `now-${days}d/d`, lte: 'now' },
              },
            },
          },
        },
      },
    });

    const body = esPayload(esResp);
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? 0;
    const hits = (body?.hits?.hits || []).map((hit: any) => ({ _id: hit._id, ...hit._source }));
    const unique = new Map<string, any>();
    for (const h of hits) unique.set(h._id, h);
    const emails = Array.from(unique.values());

    return res.json({ meta: { total, page, size }, emails });
  } catch (err: any) {
    console.error('GET /emails error', err?.message ?? err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Email by Id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rawId = (req.params.id || '').toString();
    if (!rawId) return res.status(400).json({ error: 'id required' });

    const accountHint = (req.query.accountEmail || req.query.account || '').toString() || undefined;
    const email = await fetchEmailByAnyId(rawId, accountHint);
    if (!email) return res.status(404).json({ error: 'Email not found' });

    return res.json({ meta: { total: 1, page: 1, size: 1 }, emails: [email] });
  } catch (err: any) {
    console.error('GET /emails/:id error', err?.message ?? err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
