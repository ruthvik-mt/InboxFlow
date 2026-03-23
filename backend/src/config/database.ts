import { MongoClient, Db } from 'mongodb';
import logger from '../utils/logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/onebox';
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db();

  // TTL index for OTPs — expires automatically at the stored expiresAt time
  await db.collection('verification_otps').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );

  // ── Notifications: prevent duplicate entries for the same email per user ──
  // This is the DB-level safety net on top of in-memory dedup.
  await db.collection('notifications').createIndex(
    { userId: 1, messageId: 1 },
    { unique: true, sparse: true } // sparse: ignore docs where messageId is missing
  );

  // ── Notifications: performance indexes for common query patterns ──
  await db.collection('notifications').createIndex({ userId: 1, timestamp: -1 });
  await db.collection('notifications').createIndex({ userId: 1, read: 1 });

  // ── Email accounts: fast lookup by userId ──
  await db.collection('emailAccounts').createIndex({ userId: 1 });

  logger.info('[MongoDB] Connected successfully and indexes ensured');
  return db;
}

export async function getDB(): Promise<Db> {
  if (!db) {
    return await connectDB();
  }
  return db;
}