// db.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

let db;

export async function initDb() {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myAppDB');
  await client.connect();
  db = client.db(); // uses DB in the URI or defaults to myAppDB
  console.log('Connected to MongoDB');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
