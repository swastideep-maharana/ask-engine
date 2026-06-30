import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Singleton pattern: reuse the same connection pool across hot-reloads in dev.
// max: 3 — safe limit for free/hobby DB tiers (Supabase free = 15 total, keep headroom).
// idle_timeout: 20s — close unused connections quickly in serverless environments.
// connect_timeout: 10s — fail fast instead of hanging if the DB is overloaded.
const globalForDb = global as unknown as { _pgClient: postgres.Sql };

const client = globalForDb._pgClient ?? postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });