#!/bin/bash

echo "=== Final Step: Docker Compose Configuration Analysis ==="
echo "Investigating /opt/addypin/ deployment structure..."
echo ""

# 1. Examine production Docker Compose
echo "1. Production Docker Compose Configuration:"
echo "========================================="
cat /opt/addypin/docker-compose.yml 2>/dev/null || echo "❌ Cannot access /opt/addypin/docker-compose.yml"
echo ""

# 2. Examine staging Docker Compose  
echo "2. Staging Docker Compose Configuration:"
echo "======================================="
cat /opt/addypin-staging/docker-compose.yml 2>/dev/null || echo "❌ Cannot access /opt/addypin-staging/docker-compose.yml"
echo ""

# 3. Check for Dockerfiles
echo "3. Dockerfile Discovery:"
echo "======================="
find /opt/addypin* -name "Dockerfile" -type f 2>/dev/null || echo "❌ No Dockerfiles found in /opt/addypin*"
echo ""

# 4. Check directory structure
echo "4. Directory Structure Analysis:"
echo "==============================="
ls -la /opt/addypin/ 2>/dev/null || echo "❌ Cannot access /opt/addypin/"
echo ""
ls -la /opt/addypin-staging/ 2>/dev/null || echo "❌ Cannot access /opt/addypin-staging/"
echo ""

# 5. Check for .env files  
echo "5. Environment Files Discovery:"
echo "=============================="
find /opt/addypin* -name ".env*" -type f 2>/dev/null || echo "❌ No .env files found in /opt/addypin*"
echo ""

# 6. Check for build scripts or CI/CD traces
echo "6. Build/Deploy Script Discovery:"
echo "================================"
find /opt/addypin* -name "*.sh" -type f 2>/dev/null | head -5
find /home -name "*deploy*" -type f 2>/dev/null | head -5
echo ""

# 7. Check Docker image build history
echo "7. Docker Image Information:"
echo "==========================="
docker images | grep addypin 2>/dev/null || echo "❌ No addypin Docker images found"
echo ""

echo "=== Final Discovery Complete ==="