#!/bin/bash

# AddyPin Health Check Script
# Comprehensive health monitoring for production deployment

# Configuration
HEALTH_CHECK_URL="https://addypin.com"
API_STATS_URL="https://addypin.com/api/stats"
API_HEALTH_URL="https://addypin.com/api/health"
LOG_FILE="/var/log/addypin/health-check-$(date '+%Y%m%d').log"
TIMEOUT=10
MAX_RESPONSE_TIME=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Status function with colors
status() {
    local level=$1
    local message=$2
    
    case $level in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            log "SUCCESS: $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️ $message${NC}"
            log "WARNING: $message"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            log "ERROR: $message"
            ;;
        "INFO")
            echo -e "ℹ️ $message"
            log "INFO: $message"
            ;;
    esac
}

# Service health check
check_service_status() {
    status "INFO" "Checking systemd service status..."
    
    if systemctl is-active --quiet addypin; then
        status "SUCCESS" "AddyPin service is running"
        
        # Get detailed service info
        local pid=$(systemctl show addypin -p MainPID --value)
        local memory=$(ps -p $pid -o %mem --no-headers 2>/dev/null | xargs)
        local cpu=$(ps -p $pid -o %cpu --no-headers 2>/dev/null | xargs)
        
        status "INFO" "Process ID: $pid"
        status "INFO" "Memory usage: ${memory}%"
        status "INFO" "CPU usage: ${cpu}%"
        
        # Check if memory usage is concerning
        if [ "$(echo "$memory > 15" | bc 2>/dev/null)" -eq 1 ]; then
            status "WARNING" "High memory usage detected"
        fi
        
        return 0
    else
        status "ERROR" "AddyPin service is not running"
        return 1
    fi
}

# Database connectivity check
check_database() {
    status "INFO" "Checking database connectivity..."
    
    if systemctl is-active --quiet postgresql; then
        status "SUCCESS" "PostgreSQL service is running"
        
        # Test database connection
        if sudo -u postgres psql -d addypin -c "SELECT 1;" > /dev/null 2>&1; then
            status "SUCCESS" "Database connection successful"
            
            # Check database size
            local db_size=$(sudo -u postgres psql -d addypin -t -c "SELECT pg_size_pretty(pg_database_size('addypin'));" | xargs)
            status "INFO" "Database size: $db_size"
            
            return 0
        else
            status "ERROR" "Cannot connect to AddyPin database"
            return 1
        fi
    else
        status "ERROR" "PostgreSQL service is not running"
        return 1
    fi
}

# HTTP endpoint checks
check_http_endpoints() {
    status "INFO" "Checking HTTP endpoints..."
    
    local total_checks=0
    local passed_checks=0
    
    # Check main page
    status "INFO" "Testing main page: $HEALTH_CHECK_URL"
    if curl -f -s --max-time $TIMEOUT "$HEALTH_CHECK_URL" > /dev/null; then
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null --max-time $TIMEOUT "$HEALTH_CHECK_URL")
        status "SUCCESS" "Main page accessible (${response_time}s)"
        
        if [ "$(echo "$response_time > $MAX_RESPONSE_TIME" | bc)" -eq 1 ]; then
            status "WARNING" "Response time is slower than expected"
        fi
        
        ((passed_checks++))
    else
        status "ERROR" "Main page not accessible"
    fi
    ((total_checks++))
    
    # Check API stats endpoint
    status "INFO" "Testing API stats: $API_STATS_URL"
    if curl -f -s --max-time $TIMEOUT "$API_STATS_URL" > /dev/null; then
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null --max-time $TIMEOUT "$API_STATS_URL")
        status "SUCCESS" "API stats endpoint accessible (${response_time}s)"
        ((passed_checks++))
    else
        status "ERROR" "API stats endpoint not accessible"
    fi
    ((total_checks++))
    
    # Check API health endpoint (if exists)
    status "INFO" "Testing API health: $API_HEALTH_URL"
    if curl -f -s --max-time $TIMEOUT "$API_HEALTH_URL" > /dev/null 2>&1; then
        status "SUCCESS" "API health endpoint accessible"
        ((passed_checks++))
    else
        status "WARNING" "API health endpoint not available (may not exist)"
    fi
    ((total_checks++))
    
    status "INFO" "HTTP endpoint checks: $passed_checks/$total_checks passed"
    
    if [ $passed_checks -eq $total_checks ]; then
        return 0
    elif [ $passed_checks -gt 0 ]; then
        return 2  # Partial success
    else
        return 1  # Complete failure
    fi
}

# SSL certificate check
check_ssl_certificate() {
    status "INFO" "Checking SSL certificate..."
    
    local cert_info=$(echo | openssl s_client -servername addypin.com -connect addypin.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        status "SUCCESS" "SSL certificate is valid"
        status "INFO" "Certificate expires on: $expiry_date"
        status "INFO" "Days until expiry: $days_until_expiry"
        
        if [ $days_until_expiry -lt 30 ]; then
            status "WARNING" "SSL certificate expires in less than 30 days"
        fi
        
        return 0
    else
        status "ERROR" "SSL certificate check failed"
        return 1
    fi
}

# System resource check
check_system_resources() {
    status "INFO" "Checking system resources..."
    
    # Disk space check
    local disk_usage=$(df /opt | tail -1 | awk '{print $5}' | sed 's/%//')
    status "INFO" "Disk usage: ${disk_usage}%"
    
    if [ $disk_usage -gt 90 ]; then
        status "ERROR" "Disk usage is critically high"
        return 1
    elif [ $disk_usage -gt 80 ]; then
        status "WARNING" "Disk usage is high"
    else
        status "SUCCESS" "Disk usage is normal"
    fi
    
    # Memory check
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_percent=$(( used_mem * 100 / total_mem ))
    
    status "INFO" "Memory usage: ${memory_percent}%"
    
    if [ $memory_percent -gt 90 ]; then
        status "WARNING" "Memory usage is high"
    else
        status "SUCCESS" "Memory usage is normal"
    fi
    
    return 0
}

# Log file check
check_logs() {
    status "INFO" "Checking recent logs for errors..."
    
    local error_count=$(journalctl -u addypin --since "1 hour ago" | grep -i error | wc -l)
    local warning_count=$(journalctl -u addypin --since "1 hour ago" | grep -i warning | wc -l)
    
    status "INFO" "Errors in last hour: $error_count"
    status "INFO" "Warnings in last hour: $warning_count"
    
    if [ $error_count -gt 10 ]; then
        status "WARNING" "High number of errors detected in logs"
        return 1
    elif [ $error_count -gt 0 ]; then
        status "INFO" "Some errors found in logs (normal level)"
    else
        status "SUCCESS" "No errors found in recent logs"
    fi
    
    return 0
}

# Main health check function
main() {
    local overall_status=0
    
    echo "🏥 AddyPin Health Check - $(date)"
    echo "=================================="
    
    # Create log directory if needed
    mkdir -p /var/log/addypin
    
    log "Starting health check"
    
    # Run all checks
    check_service_status || overall_status=1
    echo
    
    check_database || overall_status=1
    echo
    
    check_http_endpoints
    local http_status=$?
    if [ $http_status -eq 1 ]; then
        overall_status=1
    elif [ $http_status -eq 2 ]; then
        overall_status=2
    fi
    echo
    
    check_ssl_certificate || overall_status=1
    echo
    
    check_system_resources || overall_status=1
    echo
    
    check_logs || overall_status=1
    echo
    
    # Summary
    echo "=================================="
    case $overall_status in
        0)
            status "SUCCESS" "All health checks passed - System is healthy"
            ;;
        1)
            status "ERROR" "Some health checks failed - Investigation required"
            ;;
        2)
            status "WARNING" "Some health checks passed with warnings"
            ;;
    esac
    
    log "Health check completed with status: $overall_status"
    
    exit $overall_status
}

# Run main function
main "$@"