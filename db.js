import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db;

export async function initDb() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db(); // use the DB specified in the URI
  console.log('Connected to MongoDB');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
