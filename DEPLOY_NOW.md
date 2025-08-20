# Trigger CI/CD Deployment

## Step 1: Go to GitHub Repository
https://github.com/amrhas82/addypin

## Step 2: Edit server/db.ts
1. Click on `server/db.ts` file
2. Click the pencil icon (Edit)
3. Replace the entire content with:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for local PostgreSQL
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local PostgreSQL in production
};

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });
```

## Step 3: Commit
1. Scroll down
2. Add commit message: "Fix production database connectivity"
3. Click "Commit changes"

This will trigger the GitHub Actions deployment to apply the database fix.