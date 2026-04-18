#!/bin/bash
# AddyPin Production Troubleshooting Script
# Run this on your VPS to diagnose the issue

echo "========================================"
echo "AddyPin Production Troubleshooting"
echo "========================================"
echo ""

# Step 1: Check Docker container status
echo "📦 STEP 1: Checking Docker container status..."
echo "----------------------------------------"
docker ps -a | grep addypin
echo ""

# Step 2: Check container logs
echo "📋 STEP 2: Checking container logs (last 50 lines)..."
echo "----------------------------------------"
docker logs addypin-prod --tail 50
echo ""

# Step 3: Test API directly inside container
echo "🔍 STEP 3: Testing API endpoints INSIDE container..."
echo "----------------------------------------"
docker exec addypin-prod curl -s http://localhost:3000/api/health || echo "API not responding on port 3000"
echo ""
docker exec addypin-prod curl -s http://localhost:3000/api/pins || echo "Pins endpoint failed"
echo ""

# Step 4: Check nginx configuration
echo "🌐 STEP 4: Checking nginx proxy configuration..."
echo "----------------------------------------"
cat /etc/nginx/sites-available/addypin.com | grep -A 5 "location /api"
echo ""

# Step 5: Test from outside container (through nginx)
echo "🔗 STEP 5: Testing API through nginx..."
echo "----------------------------------------"
curl -s https://addypin.com/api/health || echo "Health endpoint failed through nginx"
echo ""
curl -s https://addypin.com/api/pins || echo "Pins endpoint failed through nginx"
echo ""

# Step 6: Check database connectivity from container
echo "💾 STEP 6: Testing database connection from container..."
echo "----------------------------------------"
docker exec addypin-prod sh -c 'echo "SELECT version();" | psql $DATABASE_URL' 2>&1 || echo "Database connection failed"
echo ""

# Step 7: Check environment variables
echo "🔧 STEP 7: Checking container environment variables..."
echo "----------------------------------------"
docker exec addypin-prod env | grep -E "DATABASE_URL|PORT|NODE_ENV" | sed 's/PASSWORD=.*/PASSWORD=***/'
echo ""

# Step 8: Check port bindings
echo "🔌 STEP 8: Checking port bindings..."
echo "----------------------------------------"
docker port addypin-prod
netstat -tlnp | grep :3000
echo ""

# Step 9: Check file system inside container
echo "📁 STEP 9: Checking built files in container..."
echo "----------------------------------------"
docker exec addypin-prod ls -la /app/dist/
echo ""
docker exec addypin-prod ls -la /app/dist/client/
echo ""

# Step 10: Quick fix suggestions
echo "========================================"
echo "💡 QUICK FIX SUGGESTIONS:"
echo "========================================"
echo ""
echo "If API not responding on port 3000:"
echo "  → Container might be crashing on startup"
echo "  → Check DATABASE_URL is correct"
echo ""
echo "If nginx shows 'location /api' missing:"
echo "  → Add proxy_pass configuration for /api/*"
echo ""
echo "If database connection fails:"
echo "  → Check DATABASE_URL in container"
echo "  → Verify PostgreSQL is accessible from container"
echo ""
echo "Common fix commands:"
echo "  docker restart addypin-prod"
echo "  systemctl restart nginx"
echo "  docker exec -it addypin-prod sh  # Debug inside container"