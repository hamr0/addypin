#!/bin/bash
# Database setup and migration script for VPS
# Run this INSIDE the Docker container

echo "========================================"
echo "Database Setup & Migration"
echo "========================================"
echo ""

# Step 1: Test database connection
echo "🔍 Testing database connection..."
echo "SELECT version();" | psql $DATABASE_URL 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed!"
    echo "Check DATABASE_URL environment variable"
    exit 1
fi
echo "✅ Database connected successfully"
echo ""

# Step 2: Run database migrations
echo "📦 Running database migrations..."
npm run db:push --force
if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    echo "Trying alternative approach..."
    # Alternative: Create tables manually if needed
    psql $DATABASE_URL << EOF
-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
EOF
fi
echo ""

# Step 3: Verify tables exist
echo "📋 Verifying database tables..."
psql $DATABASE_URL -c "\dt" 2>&1
echo ""

# Step 4: Check for any data
echo "📊 Checking existing data..."
psql $DATABASE_URL << EOF
SELECT 'Pins count:' as info, COUNT(*) as count FROM pins
UNION ALL
SELECT 'Analytics count:', COUNT(*) FROM analytics
UNION ALL  
SELECT 'Users count:', COUNT(*) FROM users;
EOF
echo ""

echo "✅ Database setup complete!"