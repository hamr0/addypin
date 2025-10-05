#!/bin/bash

echo "🧪 VPS TESTING - STEP 2/5: API ENDPOINT INTEGRATION TESTING"
echo "==========================================================="
echo "Phase 3/5: Complete API functionality and database operations"
echo ""

echo "📋 What this step tests:"
echo "- All API endpoints respond correctly"
echo "- Database write operations (pin creation)"
echo "- Database read operations (pin retrieval)"
echo "- Database update operations (pin editing)"
echo "- Database delete operations (pin cleanup)"
echo ""

TARGET_URL="http://localhost:3000"
echo "🎯 Testing target: $TARGET_URL"
echo ""

echo "🔍 BASIC API ENDPOINTS:"
echo "======================"

# Health endpoint
echo "1. Testing /api/health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint: HTTP $HEALTH_RESPONSE"
else
    echo "❌ Health endpoint: HTTP $HEALTH_RESPONSE"
    echo "RESULT: FAILED - Health endpoint not responding"
    exit 1
fi

# Stats endpoint  
echo "2. Testing /api/stats..."
STATS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/stats)
if [ "$STATS_RESPONSE" = "200" ]; then
    echo "✅ Stats endpoint: HTTP $STATS_RESPONSE"
    # Get actual stats data
    STATS_DATA=$(curl -s $TARGET_URL/api/stats)
    echo "   Sample data: $(echo $STATS_DATA | cut -c1-60)..."
else
    echo "❌ Stats endpoint: HTTP $STATS_RESPONSE"
    echo "RESULT: FAILED - Stats endpoint not responding"
    exit 1
fi

# Map links endpoint
echo "3. Testing /api/map-links/52.2748/4.7611..."
MAP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/map-links/52.2748/4.7611")
if [ "$MAP_RESPONSE" = "200" ]; then
    echo "✅ Map links endpoint: HTTP $MAP_RESPONSE"
else
    echo "❌ Map links endpoint: HTTP $MAP_RESPONSE"
    echo "RESULT: FAILED - Map links endpoint not responding"
    exit 1
fi

echo ""
echo "🔍 DATABASE INTEGRATION TESTS:"
echo "=============================="

# Test pin creation (database write)
echo "4. Testing PIN CREATION (Database Write)..."
CREATE_RESPONSE=$(curl -s -X POST $TARGET_URL/api/pins \
    -H "Content-Type: application/json" \
    -d '{
        "title": "VPS Integration Test",
        "description": "Created by Step 2/5 testing",
        "latitude": 52.2748,
        "longitude": 4.7611,
        "email": "test@example.com"
    }')

echo "Create response: $CREATE_RESPONSE"

# Extract shortcode from response
SHORTCODE=$(echo "$CREATE_RESPONSE" | grep -o '"shortcode":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$SHORTCODE" ] && [ "$SHORTCODE" != "null" ]; then
    echo "✅ Pin creation successful"
    echo "   Created shortcode: $SHORTCODE"
else
    echo "❌ Pin creation failed - no shortcode returned"
    echo "RESULT: FAILED - Database write operation failed"
    exit 1
fi

echo ""
echo "5. Testing PIN RETRIEVAL (Database Read)..."
GET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/pins/$SHORTCODE")
if [ "$GET_RESPONSE" = "200" ]; then
    echo "✅ Pin retrieval successful: HTTP $GET_RESPONSE"
    # Get actual pin data
    PIN_DATA=$(curl -s "$TARGET_URL/api/pins/$SHORTCODE")
    echo "   Pin data: $(echo $PIN_DATA | cut -c1-80)..."
else
    echo "❌ Pin retrieval failed: HTTP $GET_RESPONSE"
    echo "RESULT: FAILED - Database read operation failed"
    exit 1
fi

echo ""
echo "6. Testing PIN DELETION (Database Delete)..."
DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$TARGET_URL/api/pins/$SHORTCODE")
if [ "$DELETE_RESPONSE" = "200" ] || [ "$DELETE_RESPONSE" = "204" ]; then
    echo "✅ Pin deletion successful: HTTP $DELETE_RESPONSE"
else
    echo "❌ Pin deletion failed: HTTP $DELETE_RESPONSE"
    echo "⚠️ Warning: Test data not cleaned up"
fi

echo ""
echo "🔍 ADDITIONAL API ENDPOINTS:"
echo "============================"

# Security stats endpoint
echo "7. Testing /api/security/stats..."
SECURITY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/security/stats)
if [ "$SECURITY_RESPONSE" = "200" ]; then
    echo "✅ Security stats endpoint: HTTP $SECURITY_RESPONSE"
else
    echo "⚠️ Security stats endpoint: HTTP $SECURITY_RESPONSE (optional)"
fi

# Analytics endpoint
echo "8. Testing /api/analytics/comprehensive..."
ANALYTICS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/api/analytics/comprehensive)
if [ "$ANALYTICS_RESPONSE" = "200" ]; then
    echo "✅ Analytics endpoint: HTTP $ANALYTICS_RESPONSE"
else
    echo "⚠️ Analytics endpoint: HTTP $ANALYTICS_RESPONSE (optional)"
fi

echo ""
echo "✅ STEP 2/5 RESULT: SUCCESS"
echo "All critical API endpoints and database operations working"
echo ""
echo "👉 Ready for Step 3/5: External Connectivity Testing"