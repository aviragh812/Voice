import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || "boltistock");

  try {
    await db.collection("products").dropIndex("name_1");
  } catch {
    // Older versions used a global product-name index. It is safe if it is already gone.
  }

  await db.collection("products").createIndex({ ownerId: 1, name: 1 }, { unique: true });
  await db.collection("transactions").createIndex({ createdAt: -1 });
  await db.collection("transactions").createIndex({ ownerId: 1, createdAt: -1 });

  return db;
}

export async function closeDb() {
  await client?.close();
  client = null;
  db = null;
}
