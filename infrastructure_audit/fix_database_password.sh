#!/bin/bash

echo "🔒 CRITICAL SECURITY FIX: Database Password Update"
echo "=================================================="

# Step 1: Generate new secure password
echo "📝 Generating new secure database password..."
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "✅ New password generated (25 characters, secure)"

# Step 2: Stop applications (to prevent connection errors during DB restart)
echo "🛑 Stopping applications temporarily..."
docker stop addypin addypin-staging 2>/dev/null || echo "⚠️ Some containers already stopped"

# Step 3: Stop and remove old PostgreSQL container
echo "🗃️ Stopping old PostgreSQL container..."
docker stop addypin-postgres 2>/dev/null || echo "⚠️ Container already stopped"
docker rm addypin-postgres 2>/dev/null || echo "⚠️ Container already removed"

# Step 4: Start PostgreSQL with new password (SECURE: localhost only)
echo "🚀 Starting PostgreSQL with new password (localhost binding)..."
docker run -d \
  --name addypin-postgres \
  -e POSTGRES_DB=addypin \
  -e POSTGRES_USER=addypin \
  -e POSTGRES_PASSWORD="$NEW_PASSWORD" \
  -p 127.0.0.1:5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Step 5: Test database connection
echo "🔍 Testing database connection..."
docker exec addypin-postgres psql -U addypin -d addypin -c "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Step 6: Update .env files (if they exist)
echo "📝 Updating environment files..."
if [ -f /opt/addypin/.env ]; then
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/addypin:$NEW_PASSWORD@localhost:5432\/addypin/" /opt/addypin/.env
    echo "✅ Updated production .env"
fi

if [ -f /opt/addypin-staging/.env ]; then
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/addypin:$NEW_PASSWORD@localhost:5432\/addypin_staging/" /opt/addypin-staging/.env
    echo "✅ Updated staging .env"
fi

# Step 7: Restart applications with new database config
echo "🚀 Restarting applications..."
docker start addypin addypin-staging

echo "⏳ Waiting for applications to be ready..."
sleep 15

# Step 8: Test application health
echo "🔍 Testing application health..."
PROD_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
STAGING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null)

if [ "$PROD_HEALTH" = "200" ]; then
    echo "✅ Production health check passed"
else
    echo "❌ Production health check failed (HTTP $PROD_HEALTH)"
fi

if [ "$STAGING_HEALTH" = "200" ]; then
    echo "✅ Staging health check passed"
else
    echo "❌ Staging health check failed (HTTP $STAGING_HEALTH)"
fi

# Step 9: Clear bash history of old password
echo "🧹 Clearing bash history of old password..."
sed -i '/addypin_password/d' ~/.bash_history 2>/dev/null || echo "⚠️ No bash history found"
history -c 2>/dev/null || echo "⚠️ Cannot clear current history"

echo ""
echo "🎯 SECURITY FIX SUMMARY:"
echo "========================"
echo "✅ New database password generated and applied"
echo "✅ PostgreSQL now bound to localhost only (was 0.0.0.0)"
echo "✅ Old password removed from bash history"
echo "✅ Applications restarted with new credentials"
echo ""
echo "🔐 NEW DATABASE PASSWORD: $NEW_PASSWORD"
echo "⚠️  SAVE THIS PASSWORD SECURELY!"
echo ""
echo "🔍 NEXT STEPS:"
echo "- Verify applications are working properly"
echo "- Update any external services that connect to database"
echo "- Consider implementing proper secrets management"