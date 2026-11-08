import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;
let initialized = false;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Please set your Neon PostgreSQL connection string in .env.local or Vercel environment variables."
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (initialized) return;
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS slots (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        start TIMESTAMPTZ NOT NULL,
        "end" TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        slot_id TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS unique_confirmed_slot_booking 
      ON bookings (slot_id) 
      WHERE status = 'confirmed';

      CREATE INDEX IF NOT EXISTS idx_bookings_email_created 
      ON bookings (LOWER(email), created_at ASC, id ASC);

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        request_hash TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rate_limits_email_ts 
      ON rate_limits (LOWER(email), attempted_at DESC);
    `);
    initialized = true;
  } finally {
    client.release();
  }
}
