import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// VPS PostgreSQL configuration - no SSL for local database
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false
};

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });