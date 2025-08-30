#!/bin/bash

echo "🧪 TESTING CONTAINER DETECTION FIX"
echo "=================================="

echo "🔍 Current Docker containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.ID}}"

echo ""
echo "📋 OLD detection method (matches multiple):"
echo "Command: docker ps -q --filter \"name=addypin\""
OLD_RESULT=$(docker ps -q --filter "name=addypin" 2>/dev/null)
echo "Result: '$OLD_RESULT'"
echo "Count: $(echo "$OLD_RESULT" | wc -l)"

echo ""
echo "📋 NEW detection method (exact match only):"
echo "Command: docker ps -q --filter \"name=^addypin$\""
NEW_RESULT=$(docker ps -q --filter "name=^addypin$" 2>/dev/null)
echo "Result: '$NEW_RESULT'"
echo "Count: $(echo "$NEW_RESULT" | wc -l)"

echo ""
echo "🔍 Detailed analysis:"
echo "OLD method finds containers:"
docker ps --filter "name=addypin" --format "  - {{.Names}} ({{.ID}})"

echo ""
echo "NEW method finds containers:"
docker ps --filter "name=^addypin$" --format "  - {{.Names}} ({{.ID}})"

echo ""
echo "🧹 Testing cleanup commands:"
echo "Containers using port 3000:"
docker ps -q --filter "publish=3000" | while read container_id; do
    if [ ! -z "$container_id" ]; then
        echo "  Found: $container_id ($(docker ps --format '{{.Names}}' --filter id=$container_id))"
    fi
done

echo ""
echo "🎯 RECOMMENDATION:"
if [ -z "$NEW_RESULT" ]; then
    echo "❌ No exact 'addypin' container found"
    echo "💡 This explains the CI/CD failure - detection script can't find the right container"
else
    echo "✅ Found exact 'addypin' container: $NEW_RESULT"
    echo "💡 The fix should work - container detection will succeed"
fi

echo ""
echo "🧹 OPTIONAL: Clean up old test containers"
echo "To remove addypin-test container: docker rm -f addypin-test"
echo "To remove all stopped containers: docker container prune -f"