#!/bin/bash

# 🔧 AddyPin Auto-Recovery Script
# Automatically attempts to fix common service failures
# Usage: ./scripts/auto-recovery.sh

set -e

echo "🔧 AddyPin Auto-Recovery - $(date)"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=10

log_action() {
    echo "$(date): $1" | tee -a /var/log/addypin-recovery.log
}

check_and_fix_postgresql() {
    echo "🗄️ Checking PostgreSQL..."
    
    if ! systemctl is-active --quiet postgresql; then
        echo -e "${YELLOW}⚠️ PostgreSQL is not running. Attempting to start...${NC}"
        
        # Try to start PostgreSQL
        if systemctl start postgresql; then
            echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
            log_action "PostgreSQL service restarted"
            return 0
        else
            echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
            log_action "FAILED: Could not restart PostgreSQL"
            return 1
        fi
    else
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        return 0
    fi
}

check_and_fix_nginx() {
    echo "🌐 Checking Nginx..."
    
    if ! systemctl is-active --quiet nginx; then
        echo -e "${YELLOW}⚠️ Nginx is not running. Attempting to start...${NC}"
        
        # Test nginx config first
        if nginx -t >/dev/null 2>&1; then
            if systemctl start nginx; then
                echo -e "${GREEN}✅ Nginx started successfully${NC}"
                log_action "Nginx service restarted"
                return 0
            else
                echo -e "${RED}❌ Failed to start Nginx${NC}"
                log_action "FAILED: Could not restart Nginx"
                return 1
            fi
        else
            echo -e "${RED}❌ Nginx configuration is invalid${NC}"
            log_action "FAILED: Nginx config invalid"
            return 1
        fi
    else
        echo -e "${GREEN}✅ Nginx is running${NC}"
        return 0
    fi
}

check_and_fix_ssh_tunnels() {
    echo "🔐 Checking SSH tunnel connectivity..."
    
    # Check for development SSH tunnels (for monitoring when dev environments connect)
    local tunnel_count=$(ps aux | grep -v grep | grep "ssh.*155.94.144.191.*5432" | wc -l)
    
    if [ $tunnel_count -gt 0 ]; then
        echo -e "${GREEN}✅ SSH tunnels detected: $tunnel_count active${NC}"
        
        # Test tunnel connectivity
        if ! nc -z localhost 5432 2>/dev/null; then
            echo -e "${YELLOW}⚠️ SSH tunnel processes exist but port 5432 is not accessible${NC}"
            echo -e "${YELLOW}⚠️ This may indicate tunnel authentication issues${NC}"
            
            # Kill potentially broken tunnels
            echo "🔧 Cleaning up potentially broken tunnel processes..."
            pkill -f "ssh.*155.94.144.191.*5432" 2>/dev/null && echo "✅ Cleaned up tunnel processes" || echo "ℹ️ No tunnel processes to clean"
            
            log_action "SSH tunnel connectivity issues detected and processes cleaned"
            return 1
        else
            echo -e "${GREEN}✅ SSH tunnel connectivity verified${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ No SSH tunnels detected (normal for production-only monitoring)${NC}"
        return 0
    fi
}

check_and_fix_docker() {
    echo "🐳 Checking Docker container..."
    
    if ! docker ps | grep -q "addypin"; then
        echo -e "${YELLOW}⚠️ AddyPin container is not running. Attempting to restart...${NC}"
        
        # Try to restart the container
        if docker start addypin >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Container restarted successfully${NC}"
            log_action "Docker container restarted"
            sleep 5  # Give it time to start
            return 0
        else
            echo -e "${YELLOW}⚠️ Container start failed. Trying to recreate...${NC}"
            
            # If restart fails, try to recreate from latest image
            if docker stop addypin >/dev/null 2>&1; then
                docker rm addypin >/dev/null 2>&1
            fi
            
            # Recreate container (you may need to adjust the exact command)
            docker run -d --name addypin -p 3000:3000 \
              -e NODE_ENV=production \
              --restart unless-stopped \
              addypin:latest
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Container recreated successfully${NC}"
                log_action "Docker container recreated"
                sleep 10  # Give it more time to start
                return 0
            else
                echo -e "${RED}❌ Failed to recreate container${NC}"
                log_action "FAILED: Could not recreate Docker container"
                return 1
            fi
        fi
    else
        echo -e "${GREEN}✅ Docker container is running${NC}"
        return 0
    fi
}

check_health_endpoint() {
    local retries=0
    
    echo "🔍 Testing health endpoint..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time 5 $HEALTH_URL >/dev/null; then
            echo -e "${GREEN}✅ Health endpoint is responding${NC}"
            return 0
        else
            retries=$((retries + 1))
            echo -e "${YELLOW}⚠️ Health check failed (attempt $retries/$MAX_RETRIES)${NC}"
            if [ $retries -lt $MAX_RETRIES ]; then
                echo "Waiting $RETRY_DELAY seconds before retry..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    echo -e "${RED}❌ Health endpoint is not responding after $MAX_RETRIES attempts${NC}"
    return 1
}

cleanup_disk_space() {
    echo "🧹 Checking disk space..."
    
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $disk_usage -gt 85 ]; then
        echo -e "${YELLOW}⚠️ Disk usage is ${disk_usage}%. Cleaning up...${NC}"
        
        # Clean Docker images
        docker system prune -f >/dev/null 2>&1 || true
        
        # Clean old logs (keep last 7 days)
        find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
        
        local new_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
        echo -e "${GREEN}✅ Disk usage reduced to ${new_usage}%${NC}"
        log_action "Disk cleanup completed: ${disk_usage}% -> ${new_usage}%"
    else
        echo -e "${GREEN}✅ Disk usage is healthy (${disk_usage}%)${NC}"
    fi
}

# Main recovery process
main() {
    echo "Starting automated recovery process..."
    log_action "Auto-recovery process started"
    
    local recovery_needed=false
    
    # Check and fix services in order
    check_and_fix_postgresql || recovery_needed=true
    echo ""
    
    check_and_fix_nginx || recovery_needed=true
    echo ""
    
    check_and_fix_docker || recovery_needed=true
    echo ""
    
    check_and_fix_ssh_tunnels || recovery_needed=true
    echo ""
    
    # Clean up resources if needed
    cleanup_disk_space
    echo ""
    
    # Final health check
    if check_health_endpoint; then
        echo "========================================="
        echo -e "${GREEN}🎉 RECOVERY SUCCESSFUL - System is healthy!${NC}"
        log_action "Auto-recovery completed successfully"
        return 0
    else
        echo "========================================="
        echo -e "${RED}❌ RECOVERY FAILED - Manual intervention required${NC}"
        log_action "Auto-recovery failed - manual intervention needed"
        
        # Print diagnostics for manual troubleshooting
        echo ""
        echo "📋 Diagnostic Information:"
        echo "- Container status: $(docker ps --filter name=addypin --format 'table {{.Status}}')"
        echo "- PostgreSQL status: $(systemctl is-active postgresql)"
        echo "- Nginx status: $(systemctl is-active nginx)"
        echo "- Disk usage: $(df / | tail -1 | awk '{print $5}')"
        echo "- Memory usage: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
        
        return 1
    fi
}

# Create log file if it doesn't exist
sudo touch /var/log/addypin-recovery.log 2>/dev/null || true

# Run the recovery
main