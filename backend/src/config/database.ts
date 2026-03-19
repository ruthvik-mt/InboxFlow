import { MongoClient, Db } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/onebox';
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db();
  
  // Create TTL index for verification_otps
  await db.collection('verification_otps').createIndex(
    { expiresAt: 1 }, 
    { expireAfterSeconds: 0 }
  );

  console.log('[MongoDB] Connected successfully and indexes ensured');
  return db;
}

export async function getDB(): Promise<Db> {
  if (!db) {
    return await connectDB();
  }
  return db;
}