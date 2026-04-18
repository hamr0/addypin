#!/bin/bash
# VPS Container Detection Test Script
# This tests the exact commands failing in CI/CD Step 5/5

echo "🧪 CONTAINER DETECTION TEST"
echo "=========================="
echo "Testing the exact commands that fail in CI/CD Step 5/5..."
echo ""

echo "1. Current containers:"
docker ps --filter "name=addypin"
echo ""

echo "2. Container ID detection method (current failing approach):"
CONTAINER_ID=$(docker ps -q --filter "name=addypin" | head -1)
if [ ! -z "$CONTAINER_ID" ]; then
  echo "✅ SUCCESS: Container ID detected: $CONTAINER_ID"
else
  echo "❌ FAILED: No container ID detected (this is the bug)"
fi
echo ""

echo "3. Alternative detection methods to test:"
echo ""

echo "3a. With error handling:"
CONTAINER_ID_ALT1=$(docker ps -q --filter "name=addypin" 2>/dev/null | head -1)
if [ ! -z "$CONTAINER_ID_ALT1" ]; then
  echo "✅ ALT1 SUCCESS: $CONTAINER_ID_ALT1"
else
  echo "❌ ALT1 FAILED"
fi
echo ""

echo "3b. With explicit status filter:"
CONTAINER_ID_ALT2=$(docker ps -q --filter "name=addypin" --filter "status=running" | head -1)
if [ ! -z "$CONTAINER_ID_ALT2" ]; then
  echo "✅ ALT2 SUCCESS: $CONTAINER_ID_ALT2"
else
  echo "❌ ALT2 FAILED"
fi
echo ""

echo "3c. With retry logic (proposed fix):"
CONTAINER_ID_ALT3=""
for i in {1..3}; do
  CONTAINER_ID_ALT3=$(docker ps -q --filter "name=addypin" 2>/dev/null | head -1)
  if [ ! -z "$CONTAINER_ID_ALT3" ]; then
    echo "✅ ALT3 SUCCESS on attempt $i: $CONTAINER_ID_ALT3"
    break
  fi
  echo "⏳ ALT3 Retry $i: Container not found, waiting 2 seconds..."
  sleep 2
done
if [ -z "$CONTAINER_ID_ALT3" ]; then
  echo "❌ ALT3 FAILED after 3 attempts"
fi
echo ""

echo "4. Detailed container info for debugging:"
docker ps --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.ID}}\t{{.Command}}"
echo ""

echo "5. Testing environment variable access (if container found):"
if [ ! -z "$CONTAINER_ID" ] || [ ! -z "$CONTAINER_ID_ALT1" ] || [ ! -z "$CONTAINER_ID_ALT2" ] || [ ! -z "$CONTAINER_ID_ALT3" ]; then
  WORKING_ID="$CONTAINER_ID$CONTAINER_ID_ALT1$CONTAINER_ID_ALT2$CONTAINER_ID_ALT3"
  echo "Testing with container ID: $WORKING_ID"
  
  echo "5a. Environment variables:"
  ENV_CHECK=$(docker exec "$WORKING_ID" printenv | grep -E "(DATABASE_URL|NODE_ENV)" | wc -l)
  echo "Environment variables found: $ENV_CHECK"
  
  echo "5b. Node.js availability:"
  docker exec "$WORKING_ID" node --version 2>/dev/null && echo "✅ Node.js accessible" || echo "❌ Node.js not accessible"
else
  echo "❌ No working container ID found - cannot test environment access"
fi

echo ""
echo "🎯 TEST COMPLETE"
echo "==============="
echo "This script tested the exact failure point in CI/CD Step 5/5"
echo "Use results to determine which detection method works best on VPS"