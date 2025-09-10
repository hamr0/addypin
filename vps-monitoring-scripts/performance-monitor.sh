#!/bin/bash
# AddyPin Performance Monitoring Script
# Run every 15 minutes to track system performance

set -e
LOG_FILE="/var/log/addypin-performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
    echo "[$DATE] $1"
}

log "=== Performance Monitoring ==="

# 1. System Resource Usage
log "=== System Resources ==="

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
log "CPU Usage: ${CPU_USAGE}%"

# Memory Usage
MEMORY_INFO=$(free -m | awk 'NR==2{printf "Used: %s MB (%.1f%%), Free: %s MB", $3,$3*100/$2,$4}')
log "Memory: $MEMORY_INFO"

# Disk Usage
DISK_INFO=$(df -h / | awk 'NR==2{printf "Used: %s (%s), Available: %s", $3,$5,$4}')
log "Disk: $DISK_INFO"

# Load Average
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{ print $2 }')
log "Load Average:$LOAD_AVERAGE"

# 2. Docker Container Performance
log "=== Container Performance ==="

# Container resource usage
log "Container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" >> "$LOG_FILE"

# Container logs size check
for container in addypin addypin-staging addypin-postgres; do
    if docker ps -q -f name=$container > /dev/null; then
        LOG_SIZE=$(docker logs $container 2>&1 | wc -c)
        log "Container $container log size: $LOG_SIZE bytes"
    fi
done

# 3. Database Performance
log "=== Database Performance ==="

# Database connection count
PROD_CONNECTIONS=$(docker exec addypin-postgres psql -U postgres -d addypin -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='addypin';" 2>/dev/null || echo "N/A")
STAGING_CONNECTIONS=$(docker exec addypin-postgres psql -U postgres -d addypin_staging -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='addypin_staging';" 2>/dev/null || echo "N/A")

log "Production DB connections: $PROD_CONNECTIONS"
log "Staging DB connections: $STAGING_CONNECTIONS"

# Database size
PROD_DB_SIZE=$(docker exec addypin-postgres psql -U postgres -d addypin -t -c "SELECT pg_size_pretty(pg_database_size('addypin'));" 2>/dev/null || echo "N/A")
STAGING_DB_SIZE=$(docker exec addypin-postgres psql -U postgres -d addypin_staging -t -c "SELECT pg_size_pretty(pg_database_size('addypin_staging'));" 2>/dev/null || echo "N/A")

log "Production DB size: $PROD_DB_SIZE"
log "Staging DB size: $STAGING_DB_SIZE"

# 4. Application Response Times
log "=== Application Response Times ==="

# Production response time
PROD_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/api/health 2>/dev/null || echo "N/A")
log "Production API response time: ${PROD_RESPONSE_TIME}s"

# Staging response time
STAGING_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8080/api/health 2>/dev/null || echo "N/A")
log "Staging API response time: ${STAGING_RESPONSE_TIME}s"

# External domain response time
EXTERNAL_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://addypin.com/api/health 2>/dev/null || echo "N/A")
log "External domain response time: ${EXTERNAL_RESPONSE_TIME}s"

# 5. Network Performance
log "=== Network Performance ==="

# Network interface statistics
log "Network interface statistics:"
cat /proc/net/dev | grep -E "eth0|ens" | head -1 >> "$LOG_FILE" 2>/dev/null || log "Network stats not available"

# Active connections
ACTIVE_CONNECTIONS=$(netstat -an | grep ESTABLISHED | wc -l)
log "Active network connections: $ACTIVE_CONNECTIONS"

# 6. Nginx Performance
log "=== Nginx Performance ==="

# Nginx active connections (if nginx status module is enabled)
# curl -s http://localhost/nginx_status 2>/dev/null | grep "Active" >> "$LOG_FILE" || log "Nginx status not available"

# Recent requests count (approximate from access log)
if [ -f /var/log/nginx/access.log ]; then
    RECENT_REQUESTS=$(tail -1000 /var/log/nginx/access.log | wc -l)
    log "Recent requests (last 1000 log entries): $RECENT_REQUESTS"
fi

# 7. Error Log Analysis
log "=== Recent Errors ==="

# Docker container errors
for container in addypin addypin-staging addypin-postgres; do
    if docker ps -q -f name=$container > /dev/null; then
        ERROR_COUNT=$(docker logs $container --since=15m 2>&1 | grep -i error | wc -l)
        if [ $ERROR_COUNT -gt 0 ]; then
            log "Container $container: $ERROR_COUNT errors in last 15 minutes"
        fi
    fi
done

# Nginx error count
if [ -f /var/log/nginx/error.log ]; then
    NGINX_ERRORS=$(tail -100 /var/log/nginx/error.log | grep "$(date '+%Y/%m/%d %H:')" | wc -l)
    log "Nginx errors this hour: $NGINX_ERRORS"
fi

# 8. Performance Alerts
log "=== Performance Alerts ==="

# High CPU usage alert
if [ $(echo "$CPU_USAGE > 80" | bc -l) -eq 1 ]; then
    log "🚨 HIGH CPU USAGE: ${CPU_USAGE}%"
fi

# High memory usage alert
MEMORY_PERCENT=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
if [ $(echo "$MEMORY_PERCENT > 85" | bc -l) -eq 1 ]; then
    log "🚨 HIGH MEMORY USAGE: ${MEMORY_PERCENT}%"
fi

# Slow response time alert
if [ "$PROD_RESPONSE_TIME" != "N/A" ] && [ $(echo "$PROD_RESPONSE_TIME > 2.0" | bc -l) -eq 1 ]; then
    log "🚨 SLOW RESPONSE TIME: ${PROD_RESPONSE_TIME}s"
fi

log "Performance monitoring completed"
echo "" >> "$LOG_FILE"