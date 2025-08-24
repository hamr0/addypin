#!/bin/bash

# 🔍 AddyPin System Monitoring Script
# Comprehensive health monitoring for production systems
# Usage: ./scripts/system-monitor.sh

set -e

echo "🔍 AddyPin System Monitor - $(date)"
echo "========================================="

# Configuration
HEALTH_URL="https://addypin.com/api/health"
SYSTEM_URL="https://addypin.com/api/health/system"
LOCAL_HEALTH_URL="http://localhost:3000/api/health"
ALERT_EMAIL="avoidaccess@msn.com"
LOG_FILE="/var/log/addypin-monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_message() {
    echo "$(date): $1" | tee -a $LOG_FILE
}

check_external_health() {
    echo "🌐 Testing external health check..."
    if curl -f -s --max-time 10 $HEALTH_URL > /dev/null; then
        echo -e "${GREEN}✅ External health check: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ External health check: FAILED${NC}"
        return 1
    fi
}

check_local_health() {
    echo "🏠 Testing local health check..."
    if curl -f -s --max-time 5 $LOCAL_HEALTH_URL > /dev/null; then
        echo -e "${GREEN}✅ Local health check: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ Local health check: FAILED${NC}"
        return 1
    fi
}

check_database_health() {
    echo "🗄️ Testing database connectivity..."
    local health_response=$(curl -s --max-time 10 $HEALTH_URL)
    local db_status=$(echo $health_response | grep -o '"postgresql"[^}]*' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$db_status" = "healthy" ]; then
        echo -e "${GREEN}✅ Database health: HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ Database health: $db_status${NC}"
        return 1
    fi
}

check_services() {
    echo "🔧 Checking critical services..."
    
    # Check Docker container
    if docker ps | grep -q "addypin"; then
        echo -e "${GREEN}✅ Docker container: RUNNING${NC}"
    else
        echo -e "${RED}❌ Docker container: NOT RUNNING${NC}"
        return 1
    fi
    
    # Check PostgreSQL
    if systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL service: ACTIVE${NC}"
    else
        echo -e "${RED}❌ PostgreSQL service: INACTIVE${NC}"
        return 1
    fi
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx service: ACTIVE${NC}"
    else
        echo -e "${RED}❌ Nginx service: INACTIVE${NC}"
        return 1
    fi
    
    return 0
}

check_resources() {
    echo "📊 Checking system resources..."
    
    # Disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $disk_usage -lt 90 ]; then
        echo -e "${GREEN}✅ Disk usage: ${disk_usage}%${NC}"
    else
        echo -e "${RED}❌ Disk usage: ${disk_usage}% (HIGH)${NC}"
        return 1
    fi
    
    # Memory usage
    local mem_available=$(free | grep '^Mem:' | awk '{print ($7/$2) * 100.0}')
    local mem_available_int=${mem_available%.*}
    if [ $mem_available_int -gt 10 ]; then
        echo -e "${GREEN}✅ Memory available: ${mem_available_int}%${NC}"
    else
        echo -e "${YELLOW}⚠️ Memory available: ${mem_available_int}% (LOW)${NC}"
    fi
    
    return 0
}

send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    echo -e "${RED}🚨 ALERT: $message${NC}"
    
    # Here you would integrate with your preferred alerting system
    # Examples: Email, Slack, PagerDuty, etc.
    echo "Alert would be sent: $message"
}

# Main monitoring logic
main() {
    local failed_checks=0
    
    # Run all checks
    check_external_health || ((failed_checks++))
    echo ""
    
    check_local_health || ((failed_checks++))
    echo ""
    
    check_database_health || ((failed_checks++))
    echo ""
    
    check_services || ((failed_checks++))
    echo ""
    
    check_resources || ((failed_checks++))
    echo ""
    
    # Summary
    echo "========================================="
    if [ $failed_checks -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED - System is healthy!${NC}"
        log_message "All health checks passed"
    else
        echo -e "${RED}❌ $failed_checks check(s) failed${NC}"
        log_message "$failed_checks health checks failed"
        send_alert "$failed_checks AddyPin health checks failed"
        exit 1
    fi
}

# Create log file if it doesn't exist
sudo touch $LOG_FILE 2>/dev/null || LOG_FILE="./monitor.log"

# Run the monitoring
main