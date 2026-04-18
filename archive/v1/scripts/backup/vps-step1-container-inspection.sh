#!/bin/bash

echo "🧪 VPS TESTING - STEP 1/5: CONTAINER ENVIRONMENT VERIFICATION"
echo "============================================================="
echo "Phase 2/5: Container deep inspection and environment validation"
echo ""

echo "📋 What this step tests:"
echo "- Container is running correctly"
echo "- Environment variables are accessible inside container"
echo "- Database connectivity from within container"
echo "- Container health and resource usage"
echo ""

echo "🐳 Container Status Check:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 Checking addypin container specifically:"
CONTAINER_ID=$(docker ps -q --filter "name=addypin" | head -1)
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ No addypin container running"
    echo "RESULT: FAILED - Container not found"
    exit 1
else
    echo "✅ Container ID: $CONTAINER_ID"
fi

echo ""
echo "🌍 Environment Variables Inside Container:"
echo "Checking DATABASE_URL, RESEND_API_KEY, NODE_ENV..."
ENV_CHECK=$(docker exec $CONTAINER_ID printenv | grep -E "(DATABASE_URL|RESEND_API_KEY|NODE_ENV)")
if [ -z "$ENV_CHECK" ]; then
    echo "❌ Critical environment variables missing"
    echo "RESULT: FAILED - Environment variables not accessible"
    exit 1
else
    echo "$ENV_CHECK"
    echo "✅ Environment variables accessible"
fi

echo ""
echo "💾 Database Connection Test Inside Container:"
DB_TEST=$(docker exec $CONTAINER_ID node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(res => {
    console.log('SUCCESS: Database connected at', res.rows[0].now);
    pool.end();
    process.exit(0);
}).catch(err => {
    console.log('ERROR:', err.message);
    pool.end();
    process.exit(1);
});
" 2>&1)

echo "$DB_TEST"
if [[ "$DB_TEST" == *"SUCCESS"* ]]; then
    echo "✅ Database connectivity confirmed"
else
    echo "❌ Database connectivity failed"
    echo "RESULT: FAILED - Database connection issues"
    exit 1
fi

echo ""
echo "📊 Container Resource Usage:"
docker stats --no-stream $CONTAINER_ID 2>/dev/null || echo "Stats not available"

echo ""
echo "📋 Container Logs (last 10 lines):"
docker logs $CONTAINER_ID 2>&1 | tail -10

echo ""
echo "✅ STEP 1/5 RESULT: SUCCESS"
echo "Container environment is fully functional"
echo ""
echo "👉 Ready for Step 2/5: API Endpoint Testing"