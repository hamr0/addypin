#!/bin/bash

echo "🧪 TESTING DOCKER CLEANUP LOCALLY"
echo "=================================="

echo "📊 Current storage usage BEFORE cleanup:"
docker system df

echo ""
echo "🧹 Running Docker cleanup..."
docker system prune -f

echo ""
echo "📊 Storage usage AFTER cleanup:"
docker system df

echo ""
echo "✅ Docker cleanup test completed!"
echo ""
echo "🎯 RESULTS:"
echo "- Before/after storage comparison shown above"
echo "- Any freed space indicates cleanup worked"
echo "- Safe to run - only removes unused resources"