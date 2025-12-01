import mongoose from 'mongoose';

let clientDb = null;

export async function connectMongo(url, dbName) {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    clientDb = mongoose.connection.db;
    return clientDb;
  }

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
