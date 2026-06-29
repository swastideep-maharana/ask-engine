import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Prevent the connection from crashing in Next.js edge environments
const connectionString = process.env.DATABASE_URL!;

// We disable 'prepare' for Supabase connection pool compatibility
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });