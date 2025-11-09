import { MongoClient, Db } from 'mongodb';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/onebox';
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db();
  console.log('[MongoDB] Connected successfully');
  return db;
}

export async function getDB(): Promise<Db> {
  if (!db) {
    return await connectDB();
  }
  return db;
}