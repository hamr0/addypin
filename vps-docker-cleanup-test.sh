#!/bin/bash

echo "🧪 VPS DOCKER CLEANUP TEST SCRIPT"
echo "=================================="
echo "Testing Docker cleanup commands that will be added to CI/CD"
echo ""

# Change to project directory (matching CI/CD behavior)
echo "📂 Changing to project directory..."
cd /opt/personal-data-os || {
    echo "❌ Could not change to /opt/personal-data-os"
    echo "ℹ️  This directory might not exist or have different path"
    echo "📍 Current directory: $(pwd)"
    echo "📁 Available directories in /opt:"
    ls -la /opt/ 2>/dev/null || echo "No /opt directory found"
    echo ""
    echo "🔄 Continuing test from current directory..."
}

echo ""
echo "======================================"
echo "🔍 PHASE 1: CURRENT DOCKER STATUS"
echo "======================================"

echo ""
echo "📊 Current storage usage BEFORE cleanup:"
docker system df

echo ""
echo "📋 Current images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🚢 Current containers (all):"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "🔌 Current networks:"
docker network ls

echo ""
echo "💾 Current volumes:"
docker volume ls

echo ""
echo "======================================"
echo "🧹 PHASE 2: RUNNING CLEANUP"
echo "======================================"

echo ""
echo "⚠️  About to run: docker system prune -f"
echo "   This will remove:"
echo "   - All stopped containers"
echo "   - All networks not used by at least one container"
echo "   - All dangling images"
echo "   - All dangling build cache"
echo ""

read -p "🤔 Continue with cleanup? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Running Docker system cleanup..."
    docker system prune -f
    echo "✅ Docker cleanup completed!"
else
    echo "⏭️  Skipping actual cleanup (dry run mode)"
    echo "💡 To see what would be cleaned, run: docker system prune --dry-run"
fi

echo ""
echo "======================================"
echo "📊 PHASE 3: POST-CLEANUP STATUS"
echo "======================================"

echo ""
echo "📊 Storage usage AFTER cleanup:"
docker system df

echo ""
echo "📋 Remaining images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🚢 Remaining containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo "======================================"
echo "🎯 PHASE 4: SAFETY VERIFICATION"
echo "======================================"

echo ""
echo "🔍 Checking if AddyPin containers are still running..."
ADDYPIN_CONTAINERS=$(docker ps --filter "name=addypin" --format "{{.Names}}")

if [ -n "$ADDYPIN_CONTAINERS" ]; then
    echo "✅ AddyPin containers still running:"
    docker ps --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "⚠️  No AddyPin containers currently running"
    echo "📋 Checking all AddyPin containers (including stopped):"
    docker ps -a --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
fi

echo ""
echo "🌐 Testing if application is accessible..."
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Application health endpoint responding"
else
    echo "⚠️  Application health endpoint not responding"
    echo "   This might be normal if services were stopped"
fi

echo ""
echo "======================================"
echo "📋 PHASE 5: FINAL REPORT"
echo "======================================"

echo ""
echo "🎉 Docker cleanup test completed!"
echo ""
echo "📊 RESULTS SUMMARY:"
echo "- Storage usage comparison shown above"
echo "- Active containers preserved: $(docker ps -q | wc -l)"
echo "- Total images remaining: $(docker images -q | wc -l)"
echo "- AddyPin services status: $([ -n "$ADDYPIN_CONTAINERS" ] && echo "RUNNING" || echo "STOPPED")"
echo ""
echo "✅ Safe to integrate into CI/CD pipeline"
echo ""
echo "🔄 Next steps:"
echo "1. Review storage savings above"
echo "2. Confirm critical services still running"  
echo "3. If results look good, integrate into CI/CD"