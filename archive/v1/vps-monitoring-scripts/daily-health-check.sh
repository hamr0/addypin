#!/bin/bash
# AddyPin Infrastructure Daily Health Check Script
# Run this daily via cron to monitor system health

set -e
LOG_FILE="/var/log/addypin-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
ALERT_EMAIL="admin@addypin.com"  # Configure your alert email

echo "========================================" >> "$LOG_FILE"
echo "[$DATE] AddyPin Health Check Starting" >> "$LOG_FILE"

# Function to log with timestamp
log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
    echo "[$DATE] $1"
}

# Function to send alert (configure your preferred method)
send_alert() {
    local message="$1"
    log "🚨 ALERT: $message"
    # Uncomment and configure your alert method:
    # echo "$message" | mail -s "AddyPin Alert" "$ALERT_EMAIL"
    # curl -X POST -H 'Content-type: application/json' --data '{"text":"'"$message"'"}' YOUR_SLACK_WEBHOOK
}

# 1. Container Status Check
log "=== Container Status Check ==="
if docker ps --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "Up"; then
    log "✅ Production container is running"
    docker ps --filter "name=addypin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> "$LOG_FILE"
else
    send_alert "❌ Production container is DOWN"
fi

if docker ps --filter "name=addypin-staging" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "Up"; then
    log "✅ Staging container is running"
else
    send_alert "❌ Staging container is DOWN"
fi

if docker ps --filter "name=addypin-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "Up"; then
    log "✅ Database container is running"
else
    send_alert "❌ Database container is DOWN"
fi

# 2. Health Endpoint Checks
log "=== Health Endpoint Checks ==="

# Production health check
if curl -f -s -m 10 http://localhost:3000/api/health > /tmp/prod_health.json; then
    log "✅ Production health endpoint responding"
    PROD_STATUS=$(cat /tmp/prod_health.json | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    log "Production status: $PROD_STATUS"
else
    send_alert "❌ Production health endpoint FAILED"
fi

# Staging health check  
if curl -f -s -m 10 http://localhost:8080/api/health > /tmp/staging_health.json; then
    log "✅ Staging health endpoint responding"
    STAGING_STATUS=$(cat /tmp/staging_health.json | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    log "Staging status: $STAGING_STATUS"
else
    send_alert "❌ Staging health endpoint FAILED"
fi

# 3. External Domain Checks
log "=== External Domain Checks ==="

if curl -f -s -m 15 https://addypin.com/api/health > /dev/null; then
    log "✅ Production domain (addypin.com) accessible"
else
    send_alert "❌ Production domain (addypin.com) FAILED"
fi

if curl -f -s -m 15 https://staging.addypin.com/api/health > /dev/null; then
    log "✅ Staging domain (staging.addypin.com) accessible"  
else
    send_alert "❌ Staging domain (staging.addypin.com) FAILED"
fi

# 4. SSL Certificate Check
log "=== SSL Certificate Check ==="
CERT_DAYS=$(echo | openssl s_client -servername addypin.com -connect addypin.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
CERT_EPOCH=$(date -d "$CERT_DAYS" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($CERT_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -gt 30 ]; then
    log "✅ SSL certificate valid for $DAYS_LEFT days"
elif [ $DAYS_LEFT -gt 7 ]; then
    log "⚠️ SSL certificate expires in $DAYS_LEFT days"
else
    send_alert "🚨 SSL certificate expires in $DAYS_LEFT days - URGENT"
fi

# 5. Database Connectivity Check
log "=== Database Connectivity Check ==="
if docker exec addypin-postgres psql -U postgres -d addypin -c "SELECT COUNT(*) FROM pins;" > /dev/null 2>&1; then
    log "✅ Production database connectivity OK"
else
    send_alert "❌ Production database connectivity FAILED"
fi

if docker exec addypin-postgres psql -U postgres -d addypin_staging -c "SELECT COUNT(*) FROM pins;" > /dev/null 2>&1; then
    log "✅ Staging database connectivity OK"
else
    send_alert "❌ Staging database connectivity FAILED"
fi

# 6. Disk Space Check
log "=== Disk Space Check ==="
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    log "✅ Disk usage: ${DISK_USAGE}%"
elif [ $DISK_USAGE -lt 90 ]; then
    log "⚠️ Disk usage: ${DISK_USAGE}% - Warning level"
else
    send_alert "🚨 Disk usage: ${DISK_USAGE}% - CRITICAL"
fi

# 7. Docker Images Cleanup Status
log "=== Docker Images Check ==="
IMAGES_COUNT=$(docker images -q | wc -l)
log "Docker images count: $IMAGES_COUNT"
if [ $IMAGES_COUNT -gt 50 ]; then
    log "⚠️ High number of Docker images ($IMAGES_COUNT) - consider cleanup"
fi

# 8. Memory Usage Check
log "=== Memory Usage Check ==="
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
log "Memory usage: ${MEMORY_USAGE}%"
if [ $(echo "$MEMORY_USAGE > 90" | bc -l) -eq 1 ]; then
    send_alert "🚨 High memory usage: ${MEMORY_USAGE}%"
fi

# 9. Port Security Check
log "=== Port Security Check ==="
EXPOSED_PORTS=$(netstat -tlnp | grep -E ":3000|:8080|:5432" | grep -v "127.0.0.1")
if [ -z "$EXPOSED_PORTS" ]; then
    log "✅ No exposed container ports detected (localhost-only binding confirmed)"
else
    send_alert "🚨 SECURITY: Exposed container ports detected: $EXPOSED_PORTS"
fi

# 10. Nginx Status Check
log "=== Nginx Status Check ==="
if systemctl is-active --quiet nginx; then
    log "✅ Nginx service is running"
else
    send_alert "❌ Nginx service is DOWN"
fi

# Cleanup temp files
rm -f /tmp/prod_health.json /tmp/staging_health.json

log "[$DATE] Health check completed"
echo "" >> "$LOG_FILE"