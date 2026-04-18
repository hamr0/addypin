#!/bin/bash

echo "🐳 DOCKER STEP-BY-STEP CI/CD SIMULATION"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to wait and show progress
wait_with_progress() {
    local seconds=$1
    local message=$2
    echo -n "$message"
    for ((i=1; i<=seconds; i++)); do
        echo -n "."
        sleep 1
    done
    echo ""
}

print_step "1" "PRE-FLIGHT CHECKS"
echo "=================================="

echo "🔍 Current Docker containers:"
docker ps -a --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" || echo "No AddyPin containers"

echo ""
echo "🔍 Current Docker images:"
docker images | grep -E "(addypin|REPOSITORY)" || echo "No AddyPin images found"

echo ""
echo "🔍 Docker system usage:"
docker system df 2>/dev/null || echo "Could not get Docker system usage"

echo ""
print_step "2" "SIMULATE CI/CD DOCKER BUILD"
echo "=================================="

echo "🔨 Building Docker image (exactly like CI/CD does)..."
echo "Command: docker build -t addypin:test-$(date +%s) ."

# Build with timestamp to avoid conflicts
TEST_IMAGE="addypin:test-$(date +%s)"
echo "Building image: $TEST_IMAGE"

if docker build -t "$TEST_IMAGE" . ; then
    print_success "Docker build completed"
else
    print_error "Docker build failed!"
    exit 1
fi

echo ""
print_step "3" "SIMULATE CI/CD CONTAINER START"
echo "=================================="

echo "🚀 Starting container (exactly like CI/CD does)..."
TEST_CONTAINER="addypin-test-$(date +%s)"

# Stop any existing test containers
docker stop "$TEST_CONTAINER" 2>/dev/null || true
docker rm "$TEST_CONTAINER" 2>/dev/null || true

echo "Starting container: $TEST_CONTAINER"
if docker run -d \
  --name "$TEST_CONTAINER" \
  -p 3001:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NODE_ENV=production \
  "$TEST_IMAGE"; then
    print_success "Container started successfully"
else
    print_error "Container failed to start!"
    exit 1
fi

echo ""
print_step "4" "CONTAINER STATUS MONITORING"
echo "=================================="

echo "📊 Initial container status:"
docker ps --filter "name=$TEST_CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

wait_with_progress 10 "⏳ Waiting for container to initialize"

echo ""
echo "📊 Container status after wait:"
docker ps --filter "name=$TEST_CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
print_step "5" "DOCKER HEALTH CHECK SIMULATION"
echo "=================================="

echo "🩺 Testing Docker's internal health check (exactly what Docker does)..."

# Test the health check command directly in the container
echo "Command: docker exec $TEST_CONTAINER curl -f http://localhost:3000/api/health"

if docker exec "$TEST_CONTAINER" curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    print_success "Internal health check PASSED"
else
    print_error "Internal health check FAILED"
    echo ""
    echo "🔍 Let's debug this failure..."
    
    echo "📄 Container logs:"
    docker logs "$TEST_CONTAINER" --tail 20
    
    echo ""
    echo "🌐 Testing if container is responding at all:"
    docker exec "$TEST_CONTAINER" ps aux || echo "Could not list processes"
    
    echo ""
    echo "🔍 Testing different connection methods inside container:"
    echo "Test 1 - localhost:"
    docker exec "$TEST_CONTAINER" curl -v http://localhost:3000/api/health 2>&1 | head -5 || echo "localhost failed"
    
    echo "Test 2 - 127.0.0.1:"
    docker exec "$TEST_CONTAINER" curl -v http://127.0.0.1:3000/api/health 2>&1 | head -5 || echo "127.0.0.1 failed"
    
    echo "Test 3 - Container IP:"
    CONTAINER_IP=$(docker inspect "$TEST_CONTAINER" | grep -i ipaddress | head -1 | cut -d '"' -f 4)
    echo "Container IP: $CONTAINER_IP"
    if [ ! -z "$CONTAINER_IP" ]; then
        docker exec "$TEST_CONTAINER" curl -v "http://$CONTAINER_IP:3000/api/health" 2>&1 | head -5 || echo "Container IP failed"
    fi
fi

echo ""
print_step "6" "EXTERNAL ACCESS TESTING"
echo "=================================="

echo "🌐 Testing external access (what CI/CD does)..."
wait_with_progress 5 "⏳ Waiting for external access to stabilize"

echo "External health check via port 3001:"
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    print_success "External health check PASSED"
    echo "Response:"
    curl -s http://localhost:3001/api/health | jq . || curl -s http://localhost:3001/api/health
else
    print_error "External health check FAILED"
    echo "HTTP Status:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "Connection failed"
fi

echo ""
print_step "7" "DOCKER HEALTH STATUS CHECK"
echo "=================================="

echo "🩺 Checking Docker's official health status..."
wait_with_progress 30 "⏳ Waiting for Docker health check to run"

echo "Docker health status:"
docker inspect "$TEST_CONTAINER" | jq -r '.[0].State.Health.Status // "No health check configured"'

echo ""
echo "Docker health logs:"
docker inspect "$TEST_CONTAINER" | jq -r '.[0].State.Health.Log[]? | "Status: \(.ExitCode) | \(.Output)"' || echo "No health logs"

echo ""
print_step "8" "TIMING RACE CONDITION TEST"
echo "=================================="

echo "⏱️ Testing for race conditions (multiple rapid health checks)..."
for i in {1..5}; do
    echo -n "Check $i: "
    if timeout 10 curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        print_success "PASS"
    else
        print_error "FAIL"
    fi
    sleep 2
done

echo ""
print_step "9" "CLEANUP AND IMAGE MANAGEMENT"
echo "=================================="

echo "🧹 Cleaning up test container..."
docker stop "$TEST_CONTAINER"
docker rm "$TEST_CONTAINER"

echo ""
echo "🗑️ Docker image cleanup analysis..."
echo "Current images:"
docker images | grep -E "(addypin|test-|<none>)" || echo "No test images found"

echo ""
echo "💾 Storage usage:"
docker system df

echo ""
read -p "🗑️ Should we clean up dangling/test images? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up dangling images..."
    docker image prune -f
    echo "Cleaning up test images..."
    docker images | grep "addypin:test-" | awk '{print $3}' | xargs -r docker rmi
fi

echo ""
echo "🏁 DOCKER STEP-BY-STEP ANALYSIS COMPLETE"
echo "========================================"
echo "Review the results above to identify:"
echo "1. Where exactly the process fails"
echo "2. Internal vs external connectivity issues"  
echo "3. Docker health check vs actual API status"
echo "4. Race conditions or timing issues"
echo "5. Image cleanup needs"