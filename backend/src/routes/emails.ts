import logger from '../utils/logger';
import express, { Response } from 'express';
import { esClient, fetchEmailByAnyId } from '../services/elasticService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();
const es = esClient as any;

router.use(authenticateToken);

async function getUserAccountEmails(userId: string): Promise<string[]> {
    try {
        const db = await getDB();
        const userAccounts = await db
            .collection('emailAccounts')
            .find({ userId: new ObjectId(userId), isActive: true })
            .project({ email: 1 })
            .toArray();
        logger.info(`[Email Filter] User ${userId} has ${userAccounts.length} active accounts`);
        return userAccounts.map((acc: any) => acc.email);
    } catch (err) {
        logger.error('Error fetching user accounts:', err);
        return [];
    }
}

router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const userAccountEmails = await getUserAccountEmails(req.userId!);
        if (userAccountEmails.length === 0) {
            return res.json({ total: 0, byCategory: {} });
        }

        const esResp = await es.search({
            index: 'emails',
            size: 0,
            query: {
                bool: {
                    filter: [{ terms: { accountEmail: userAccountEmails } }],
                },
            },
            aggs: {
                by_category: {
                    terms: { field: 'category', size: 10 },
                },
            },
        });

        const total = esResp.hits?.total?.value ?? esResp.hits?.total ?? 0;
        const buckets = esResp.aggregations?.by_category?.buckets || [];
        const byCategory = buckets.reduce((acc: any, bucket: any) => {
            acc[bucket.key] = bucket.doc_count;
            return acc;
        }, {});

        return res.json({ total, byCategory });
    } catch (err: any) {
        logger.error('GET /emails/stats error:', err?.message ?? err);
        return res.status(500).json({ error: 'Failed to get email stats' });
    }
});

router.get('/search', async (req: AuthRequest, res: Response) => {
    const q = (req.query.q as string) || '';
    const idParam = (req.query._id || req.query.id || '').toString();
    const account = req.query.account as string | undefined;
    const folder = req.query.folder as string | undefined;
    const label = req.query.label as string | undefined;

    try {
        const userAccountEmails = await getUserAccountEmails(req.userId!);
        logger.info(`[Search] User accounts:`, userAccountEmails);

        if (userAccountEmails.length === 0) {
            return res.json({ meta: { total: 0, size: 0 }, emails: [] });
        }

        if (idParam) {
            try {
                const result: any = await es.get({ index: 'emails', id: idParam });
                if (result.found) {
                    const source = (result._source ?? {}) as Record<string, unknown>;
                    if (!userAccountEmails.includes(source.accountEmail as string)) {
                        return res.status(403).json({ error: 'Access denied' });
                    }
                    return res.json({ meta: { total: 1, size: 1 }, emails: [{ _id: result._id, ...source }] });
                }
                return res.status(404).json({ error: 'Email not found' });
            } catch (err: unknown) {
                const esErr = err as any;
                if (esErr?.meta?.statusCode === 404) return res.status(404).json({ error: 'Email not found' });
                logger.error('>>> Elasticsearch /emails/search by ID error:', esErr?.message ?? esErr);
                throw err;
            }
        }

        const must: Record<string, unknown>[] = [];
        const filter: Record<string, unknown>[] = [];

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
        if (account) filter.push({ term: { accountEmail: account } });
        if (folder) filter.push({ term: { folder } });
        if (label) filter.push({ term: { category: label } });

        const esResp = await es.search({
            index: 'emails',
            size: 100,
            sort: [{ date: { order: 'desc' } }],
            query: { bool: { ...(must.length ? { must } : {}), filter } },
        });

        const hits = (esResp.hits?.hits || []).map((hit: any) => ({ _id: hit._id, ...hit._source }));
        const total = esResp.hits?.total?.value ?? esResp.hits?.total ?? hits.length;

        logger.info(`[Search] Found ${hits.length} emails (total: ${total})`);
        return res.json({ meta: { total, size: hits.length }, emails: hits });
    } catch (err: any) {
        logger.error('>>> Elasticsearch /emails/search error:', err?.message ?? err);
        return res.status(500).json({ error: 'Error searching emails' });
    }
});

router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userAccountEmails = await getUserAccountEmails(req.userId!);
        logger.info(`[List] User accounts:`, userAccountEmails);

        if (userAccountEmails.length === 0) {
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

        const esResp = await es.search({
            index: 'emails',
            from,
            size,
            sort: [{ date: { order: 'desc' } }],
            query: {
                bool: {
                    filter: [
                        { terms: { accountEmail: userAccountEmails } },
                        { range: { date: { gte: `now-${days}d/d`, lte: 'now' } } },
                    ],
                },
            },
        });

        const total = esResp.hits?.total?.value ?? esResp.hits?.total ?? 0;
        const hits = (esResp.hits?.hits || []).map((hit: any) => ({ _id: hit._id, ...hit._source }));
        const unique = new Map<string, any>();
        for (const h of hits) unique.set(h._id, h);
        const emails = Array.from(unique.values());

        logger.info(`[List] Found ${emails.length} emails for user (total: ${total})`);
        return res.json({ meta: { total, page, size }, emails });
    } catch (err: any) {
        logger.error('GET /emails error', err?.message ?? err);
        return res.status(500).json({ error: 'Server error' });
    }
});

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
        logger.error('GET /emails/:id error', err?.message ?? err);
        return res.status(500).json({ error: 'Server error' });
    }
});

export default router;