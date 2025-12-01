import mongoose from 'mongoose';

/**
 * Minimal compatibility layer so legacy controllers that call getDb()
 * can read the native MongoDB `db` object when mongoose is used by the app.
 *
 * Usage:
 * - The application should call mongoose.connect(...) before using getDb(),
 *   then getDb() will return mongoose.connection.db.
 * - Alternatively, callers can call connectMongo(url) to establish a MongoClient
 *   connection (fallback) and then getDb() will return the connected db.
 */

let clientDb = null;

export async function connectMongo(url, dbName) {
  // Prefer mongoose if already connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    clientDb = mongoose.connection.db;
    return clientDb;
  }

  // Fallback to native MongoClient
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  clientDb = client.db(dbName);
  return clientDb;
}

export function getDb() {
  if (clientDb) return clientDb;
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
    clientDb = mongoose.connection.db;
    return clientDb;
  }
  throw new Error('MongoDB not connected. Call mongoose.connect(...) or connectMongo(...) before getDb().');
}

export default { connectMongo, getDb };
