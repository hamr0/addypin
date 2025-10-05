#!/bin/bash

echo "🔍 VPS HEALTH CHECK DEEP DEBUGGING"
echo "=================================="

echo ""
echo "📋 Phase 1: Container Status Analysis"
echo "-----------------------------------"
echo "🐳 All AddyPin containers:"
docker ps -a --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"

echo ""
echo "🔍 Detailed container inspection:"
for container in $(docker ps -q --filter "name=addypin"); do
    echo "Container: $(docker ps --format '{{.Names}}' --filter id=$container)"
    echo "Health Status: $(docker inspect $container | jq -r '.[0].State.Health.Status // "No health check"')"
    echo "Running: $(docker inspect $container | jq -r '.[0].State.Running')"
    echo "Exit Code: $(docker inspect $container | jq -r '.[0].State.ExitCode')"
    echo ""
done

echo ""
echo "📋 Phase 2: Network & Port Analysis" 
echo "----------------------------------"
echo "🌐 Port 3000 usage:"
netstat -tulpn | grep :3000 || echo "No processes on port 3000"

echo ""
echo "🔍 Process details:"
lsof -i :3000 2>/dev/null || echo "No lsof data for port 3000"

echo ""
echo "📋 Phase 3: Health Endpoint Testing"
echo "-----------------------------------"
echo "🩺 Testing different endpoint variations..."

# Test 1: Basic localhost
echo "Test 1 - localhost:"
curl -v http://localhost:3000/api/health 2>&1 | head -10

echo ""
echo "Test 2 - 127.0.0.1:"
curl -v http://127.0.0.1:3000/api/health 2>&1 | head -10

echo ""  
echo "Test 3 - External IP:"
curl -v http://155.94.144.191:3000/api/health 2>&1 | head -10

echo ""
echo "Test 4 - Silent flag test (CI/CD style):"
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Silent curl test PASSED"
else
    echo "❌ Silent curl test FAILED (exit code: $?)"
fi

echo ""
echo "Test 5 - HTTP status code test:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
echo "HTTP Status Code: $HTTP_CODE"

echo ""
echo "📋 Phase 4: Application Log Analysis"
echo "-----------------------------------"
echo "📄 Recent AddyPin logs:"
docker logs addypin --tail 20 2>/dev/null || echo "No addypin container logs"

echo ""
echo "📋 Phase 5: Timing & Race Condition Tests"  
echo "----------------------------------------"
echo "⏱️ Sequential health checks (like CI/CD does):"
for i in {1..5}; do
    echo -n "Check $i: "
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ PASS"
    else
        echo "❌ FAIL"
    fi
    sleep 1
done

echo ""
echo "📋 Phase 6: Docker Health Check vs API Health" 
echo "--------------------------------------------"
echo "🐳 Docker's health check status:"
docker inspect addypin | jq -r '.[0].State.Health // "No Docker health check configured"'

echo ""
echo "🩺 API health check response:"
curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health

echo ""
echo "📋 Phase 7: Environment Variables Check"
echo "--------------------------------------"  
echo "🔍 Container environment variables:"
docker exec addypin printenv | grep -E "(DATABASE_URL|NODE_ENV|RESEND|PORT)" || echo "Could not access container env"

echo ""
echo "🏁 DIAGNOSIS COMPLETE"
echo "==================="
echo "Review the results above to identify:"
echo "1. Container status inconsistencies"  
echo "2. Port conflicts or access issues"
echo "3. Health endpoint response variations"
echo "4. Timing/race conditions"
echo "5. Docker vs API health check mismatches"