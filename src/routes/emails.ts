import express, { Response } from 'express';
import { esClient, fetchEmailByAnyId } from '../services/elasticService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Require authentication for all email routes
router.use(authenticateToken);

function esPayload(result: any): any {
  return (result && (result.body ?? result)) || null;
}

// Helper to get user's account emails
async function getUserAccountEmails(userId: string): Promise<string[]> {
  try {
    const db = await getDB();
    const userAccounts = await db
      .collection('emailAccounts')
      .find({
        userId: new ObjectId(userId),
        isActive: true
      })
      .project({ email: 1 })
      .toArray();
    
    console.log(`[Email Filter] User ${userId} has ${userAccounts.length} active accounts`);
    return userAccounts.map(acc => acc.email);
  } catch (err) {
    console.error('Error fetching user accounts:', err);
    return [];
  }
}

// Emails search
router.get('/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const idParam = (req.query._id || req.query.id || '').toString();
  const account = req.query.account as string | undefined;
  const folder = req.query.folder as string | undefined;
  const label = req.query.label as string | undefined;

  try {
    const userAccountEmails = await getUserAccountEmails(req.userId!);
    
    console.log(`[Search] User accounts:`, userAccountEmails);
    
    if (userAccountEmails.length === 0) {
      console.log('[Search] No active accounts found for user');
      return res.json({ meta: { total: 0, size: 0 }, emails: [] });
    }

    if (idParam) {
      try {
        const result = await esClient.get({ index: 'emails', id: idParam });
        const payload = esPayload(result);
        if (payload?.found) {
          const source = payload._source as Record<string, any>;
          
          if (!userAccountEmails.includes(source.accountEmail)) {
            return res.status(403).json({ error: 'Access denied' });
          }
          
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
    
    //Fix
    filter.push({ terms: { accountEmail: userAccountEmails } });
    
    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['subject', 'body', 'from', 'to'],
          fuzziness: 'AUTO',
        },
      });
    }
    if (account) {
      filter.push({ term: { accountEmail: account } });
    }
    if (folder) {
      filter.push({ term: { folder: folder } });
    }
    if (label) {
      filter.push({ term: { category: label } });
    }

    const query = { bool: { ...(must.length ? { must } : {}), filter } };

    console.log('[Search] Query:', JSON.stringify(query, null, 2));

    const esResp = await esClient.search({
      index: 'emails',
      body: {
        size: 100,
        sort: [{ date: { order: 'desc' } }],
        query
      }
    });
    
    const body = esPayload(esResp);
    const hits = (body?.hits?.hits || []).map((hit: any) => ({ _id: hit._id, ...hit._source }));
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? hits.length;

    console.log(`[Search] Found ${hits.length} emails (total: ${total})`);

    return res.json({ meta: { total, size: hits.length }, emails: hits });
  } catch (err: any) {
    console.error('>>> Elasticsearch /emails/search error:', err?.meta?.body?.error ?? err?.message ?? err);
    return res.status(500).json({ error: 'Error searching emails' });
  }
});

// Emails list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userAccountEmails = await getUserAccountEmails(req.userId!);
    
    console.log(`[List] User accounts:`, userAccountEmails);
    
    if (userAccountEmails.length === 0) {
      console.log('[List] No active accounts found for user');
      return res.json({ meta: { total: 0, page: 1, size: 0 }, emails: [] });
    }

    const idParam = (req.query._id || req.query._Id || req.query.id || req.query.ID || '').toString();
    const accountHint = (req.query.accountEmail || req.query.account || '').toString() || undefined;
    
    if (idParam) {
      const email = await fetchEmailByAnyId(idParam, accountHint);
      if (!email) return res.status(404).json({ error: 'Email not found' });
      
      if (!userAccountEmails.includes(email.accountEmail)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json({ meta: { total: 1, page: 1, size: 1 }, emails: [email] });
    }

    const days = parseInt((req.query.days as string) || '30', 10);
    const size = Math.min(parseInt((req.query.size as string) || '200', 10), 1000);
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const from = (page - 1) * size;

    // Fix
    const esResp = await esClient.search({
      index: 'emails',
      body: {
        from,
        size,
        sort: [{ date: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { terms: { accountEmail: userAccountEmails } },
              {
                range: {
                  date: { gte: `now-${days}d/d`, lte: 'now' },
                },
              },
            ],
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

    console.log(`[List] Found ${emails.length} emails for user (total: ${total})`);

    return res.json({ meta: { total, page, size }, emails });
  } catch (err: any) {
    console.error('GET /emails error', err?.message ?? err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Email by Id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const rawId = (req.params.id || '').toString();
    if (!rawId) return res.status(400).json({ error: 'id required' });

    const userAccountEmails = await getUserAccountEmails(req.userId!);
    
    if (userAccountEmails.length === 0) {
      return res.status(403).json({ error: 'No accounts configured' });
    }

    const accountHint = (req.query.accountEmail || req.query.account || '').toString() || undefined;
    const email = await fetchEmailByAnyId(rawId, accountHint);
    
    if (!email) return res.status(404).json({ error: 'Email not found' });
    
    if (!userAccountEmails.includes(email.accountEmail)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ meta: { total: 1, page: 1, size: 1 }, emails: [email] });
  } catch (err: any) {
    console.error('GET /emails/:id error', err?.message ?? err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;