#!/bin/bash

# 🖥️ Universal AddyPin Health Check
# Works from anywhere on VPS - just run: health

set -e

# Universal paths (absolute - works from anywhere)
LOG_FILE="/var/log/addypin-health.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Main health check function
health_check() {
    echo -e "${CYAN}🖥️ AddyPin Health Check${NC}"
    echo "=============================="
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "📅 $timestamp"
    echo ""
    
    local all_healthy=true
    
    # 1. Basic Services
    echo -e "${BLUE}🔍 Checking Core Services...${NC}"
    
    if systemctl is-active nginx >/dev/null 2>&1; then
        echo "✅ Nginx: Running"
    else
        echo -e "${RED}❌ Nginx: Failed${NC}"
        all_healthy=false
    fi
    
    if systemctl is-active docker >/dev/null 2>&1; then
        echo "✅ Docker: Running" 
    else
        echo -e "${RED}❌ Docker: Failed${NC}"
        all_healthy=false
    fi
    
    if systemctl is-active sshd >/dev/null 2>&1; then
        echo "✅ SSH Daemon: Running"
    else
        echo -e "${RED}❌ SSH Daemon: Failed${NC}"
        all_healthy=false
    fi
    
    if netstat -ln | grep -q ":22 "; then
        echo "✅ SSH Port 22: Listening"
    else
        echo -e "${RED}❌ SSH Port 22: Not listening${NC}"
        all_healthy=false
    fi
    
    # 2. Containers
    echo ""
    echo -e "${BLUE}📦 Checking Containers...${NC}"
    
    # Production
    if docker ps --filter name=addypin-app --filter status=running -q | grep -q .; then
        echo "✅ Production: Running"
    else
        echo -e "${RED}❌ Production: Failed${NC}"
        all_healthy=false
    fi
    
    # Staging  
    if docker ps --filter name=addypin-staging-app --filter status=running -q | grep -q .; then
        echo "✅ Staging: Running"
    else
        echo -e "${YELLOW}⚠️ Staging: Not running${NC}"
    fi
    
    # Database
    if docker ps --filter name=addypin-postgres --filter status=running -q | grep -q .; then
        echo "✅ Database: Running"
    else
        echo -e "${YELLOW}⚠️ Database: Not running${NC}"
    fi
    
    # 3. Health Endpoints
    echo ""
    echo -e "${BLUE}🏥 Checking Health Endpoints...${NC}"
    
    # Production health
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Production API: Healthy"
    else
        echo -e "${RED}❌ Production API: Unhealthy${NC}"
        all_healthy=false
    fi
    
    # Staging health  
    if curl -sf http://localhost:8080/api/health >/dev/null 2>&1; then
        echo "✅ Staging API: Healthy"
    else
        echo -e "${YELLOW}⚠️ Staging API: Unhealthy${NC}"
    fi
    
    # 4. System Resources
    echo ""
    echo -e "${BLUE}💾 System Resources...${NC}"
    
    # Disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        echo "✅ Disk Space: ${disk_usage}% used"
    else
        echo -e "${YELLOW}⚠️ Disk Space: ${disk_usage}% used (high)${NC}"
    fi
    
    # Memory
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$mem_usage" -lt 80 ]; then
        echo "✅ Memory: ${mem_usage}% used"
    else
        echo -e "${YELLOW}⚠️ Memory: ${mem_usage}% used (high)${NC}"
    fi
    
    # 5. Summary
    echo ""
    echo "=============================="
    if [ "$all_healthy" = true ]; then
        echo -e "${GREEN}✅ OVERALL STATUS: HEALTHY${NC}"
        echo "🎉 All critical systems operational"
    else
        echo -e "${RED}❌ OVERALL STATUS: ISSUES DETECTED${NC}"
        echo "🚨 Critical systems need attention"
    fi
    echo ""
    
    # Log the result
    echo "[$timestamp] Health check: $([ "$all_healthy" = true ] && echo "HEALTHY" || echo "ISSUES")" >> "$LOG_FILE"
}

# Quick status (one-liner)
quick_status() {
    local prod_status="❌"
    local staging_status="❌" 
    local db_status="❌"
    
    curl -sf http://localhost:3000/api/health >/dev/null 2>&1 && prod_status="✅"
    curl -sf http://localhost:8080/api/health >/dev/null 2>&1 && staging_status="✅"
    docker ps --filter name=addypin-postgres --filter status=running -q | grep -q . && db_status="✅"
    
    echo "🖥️ AddyPin Status: Production $prod_status | Staging $staging_status | Database $db_status"
}

# Main execution
case "${1:-check}" in
    "check"|"")
        health_check
        ;;
    "quick")
        quick_status
        ;;
    *)
        echo "Usage: health [quick]"
        ;;
esac
