import mongoose from 'mongoose';

// Read lazily: top-level throws would break `next build` when secrets are
// intentionally absent from the build environment.
const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cache the connection across hot reloads without leaking `any` into the file.
const globalForMongoose = globalThis as unknown as {
  __mongoose?: MongooseCache;
};

function cache(): MongooseCache {
  if (!globalForMongoose.__mongoose) {
    globalForMongoose.__mongoose = { conn: null, promise: null };
  }
  return globalForMongoose.__mongoose;
}

export async function connectDB() {
  const cached = cache();

  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
