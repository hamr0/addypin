import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema";
import { config } from 'dotenv';

// Load .env file in development to override Replit Secrets
if (process.env.NODE_ENV === 'development') {
  config({ override: true });
  console.log('🔧 Development mode: Using local .env database configuration');
  console.log('📍 Database host:', new URL(process.env.DATABASE_URL!).host);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database configuration with environment-appropriate SSL
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? false : { rejectUnauthorized: false }
};

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });
