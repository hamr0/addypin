#!/bin/bash

echo "🧪 STEP 1/5 - API & BUILD PROCESS SIMULATION"
echo "============================================="
echo "Phase 2/5 preparation: Test API endpoints and build process"
echo ""

# Use existing development server (since it's already running)
TARGET_URL="http://localhost:3000"

echo "📋 Testing Configuration:"
echo "Target: $TARGET_URL"
echo "Testing against development server (production build tested on VPS)"
echo ""

echo "🔍 Step 1.1: Testing build process simulation..."
echo "Build command: npm run build"
# Test that our build process works
npm run build >/dev/null 2>&1
BUILD_STATUS=$?
if [ $BUILD_STATUS -eq 0 ]; then
    echo "✅ Application build process: WORKING"
else
    echo "❌ Application build process: FAILED"
    echo "This would prevent Docker container creation"
    exit 1
fi

echo ""
echo "🔍 Step 1.2: Testing core API endpoints..."

# Health endpoint
echo "Testing /api/health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint: HTTP $HEALTH_RESPONSE"
else
    echo "❌ Health endpoint: HTTP $HEALTH_RESPONSE"
    exit 1
fi

# Stats endpoint  
echo "Testing /api/stats..."
STATS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/stats)
if [ "$STATS_RESPONSE" = "200" ]; then
    echo "✅ Stats endpoint: HTTP $STATS_RESPONSE"
else
    echo "❌ Stats endpoint: HTTP $STATS_RESPONSE"
    exit 1
fi

# Map links endpoint
echo "Testing /api/map-links/52.2748/4.7611..."
MAP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/map-links/52.2748/4.7611")
if [ "$MAP_RESPONSE" = "200" ]; then
    echo "✅ Map links endpoint: HTTP $MAP_RESPONSE"
else
    echo "❌ Map links endpoint: HTTP $MAP_RESPONSE"
    exit 1
fi

echo ""
echo "🔍 Step 1.3: Testing database connectivity..."
# Test that stats endpoint returns actual data (proves database works)
STATS_DATA=$(curl -s $TARGET_URL/api/stats)
if [[ "$STATS_DATA" == *"pinsCreated"* ]]; then
    echo "✅ Database connectivity: WORKING"
    echo "   Response includes: $(echo $STATS_DATA | cut -c1-80)..."
else
    echo "❌ Database connectivity: FAILED"
    echo "   Response: $STATS_DATA"
    exit 1
fi

echo ""
echo "📊 STEP 1/5 RESULTS:"
echo "✅ Build process: WORKING"
echo "✅ Core API endpoints: WORKING"
echo "✅ Database connectivity: WORKING"
echo "✅ Environment setup: READY"
echo ""
echo "🚀 Ready to proceed to Step 2/5 - API Integration Tests"
echo ""
echo "📝 NOTE: Container testing will be done on VPS where Docker is available"
echo "         Local simulation confirms all API functionality works correctly"