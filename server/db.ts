import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema";

// Use working database URL if available, fallback to default DATABASE_URL
const databaseUrl = process.env.WORKING_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or WORKING_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// VPS PostgreSQL configuration - no SSL for local database
const connectionConfig = {
  connectionString: databaseUrl,
  ssl: false
};

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });
