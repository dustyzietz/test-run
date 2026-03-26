import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? process.env.MONGO_URI;

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };

global.mongooseCache = cached;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function isDatabaseConfigured() {
  return Boolean(MONGODB_URI);
}
