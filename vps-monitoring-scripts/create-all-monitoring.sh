#!/bin/bash
# All-in-one AddyPin Monitoring Setup Script
# Run this single script on your VPS to create all monitoring files

echo "🚀 Creating AddyPin Monitoring Suite..."

# Create directories
sudo mkdir -p /opt/addypin-monitoring
sudo mkdir -p /opt/backups
sudo mkdir -p /var/log

# Create daily health check script
cat > /tmp/daily-health-check.sh << 'HEALTH_SCRIPT_END'
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

# 5. Port Security Check
log "=== Port Security Check ==="
EXPOSED_PORTS=$(netstat -tlnp | grep -E ":3000|:8080|:5432" | grep -v "127.0.0.1")
if [ -z "$EXPOSED_PORTS" ]; then
    log "✅ No exposed container ports detected (localhost-only binding confirmed)"
else
    send_alert "🚨 SECURITY: Exposed container ports detected: $EXPOSED_PORTS"
fi

# Cleanup temp files
rm -f /tmp/prod_health.json /tmp/staging_health.json

log "[$DATE] Health check completed"
echo "" >> "$LOG_FILE"
HEALTH_SCRIPT_END

# Create backup script
cat > /tmp/backup-script.sh << 'BACKUP_SCRIPT_END'
#!/bin/bash
# AddyPin Backup Script
# Daily backup of databases and configurations

set -e
BACKUP_DIR="/opt/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/addypin-backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== Starting AddyPin Backup Process ==="

# Database Backups
log "=== Database Backup ==="

# Production database backup
log "Backing up production database..."
docker exec addypin-postgres pg_dump -U postgres -d addypin > "$BACKUP_DIR/addypin_prod_${DATE}.sql"
if [ $? -eq 0 ]; then
    log "✅ Production database backed up successfully"
else
    log "❌ Production database backup failed"
    exit 1
fi

# Staging database backup
log "Backing up staging database..."
docker exec addypin-postgres pg_dump -U postgres -d addypin_staging > "$BACKUP_DIR/addypin_staging_${DATE}.sql"
if [ $? -eq 0 ]; then
    log "✅ Staging database backed up successfully"
else
    log "❌ Staging database backup failed"
    exit 1
fi

# Configuration Backup
log "=== Configuration Backup ==="
CONFIG_BACKUP_DIR="$BACKUP_DIR/config_${DATE}"
mkdir -p "$CONFIG_BACKUP_DIR"

# Backup Docker Compose files
cp /opt/addypin/docker-compose.yml "$CONFIG_BACKUP_DIR/docker-compose-prod.yml" 2>/dev/null
cp /opt/addypin-staging/docker-compose.yml "$CONFIG_BACKUP_DIR/docker-compose-staging.yml" 2>/dev/null

# Backup Nginx configuration
cp -r /etc/nginx/conf.d "$CONFIG_BACKUP_DIR/nginx-conf.d" 2>/dev/null
cp /etc/nginx/nginx.conf "$CONFIG_BACKUP_DIR/nginx.conf" 2>/dev/null

log "✅ Configuration files backed up"

# Create compressed archive
log "=== Creating Compressed Archive ==="
cd "$BACKUP_DIR"
tar -czf "addypin_backup_${DATE}.tar.gz" addypin_prod_${DATE}.sql addypin_staging_${DATE}.sql config_${DATE}/
if [ $? -eq 0 ]; then
    log "✅ Compressed backup archive created: addypin_backup_${DATE}.tar.gz"
    rm -f addypin_prod_${DATE}.sql addypin_staging_${DATE}.sql
    rm -rf config_${DATE}/
else
    log "❌ Failed to create compressed archive"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "addypin_backup_*.tar.gz" -type f -mtime +7 -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "addypin_backup_*.tar.gz" -type f | wc -l)
log "✅ Cleanup completed. $REMAINING_BACKUPS backup files remaining"

BACKUP_SIZE=$(du -sh "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" | cut -f1)
log "=== Backup Process Completed Successfully ==="
log "Backup location: $BACKUP_DIR/addypin_backup_${DATE}.tar.gz"
log "Backup size: $BACKUP_SIZE"
BACKUP_SCRIPT_END

# Create performance monitor script
cat > /tmp/performance-monitor.sh << 'PERF_SCRIPT_END'
#!/bin/bash
# AddyPin Performance Monitoring Script

set -e
LOG_FILE="/var/log/addypin-performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
    echo "[$DATE] $1"
}

log "=== Performance Monitoring ==="

# System Resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_INFO=$(free -m | awk 'NR==2{printf "Used: %s MB (%.1f%%)", $3,$3*100/$2}')
DISK_INFO=$(df -h / | awk 'NR==2{printf "Used: %s (%s)", $3,$5}')
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{ print $2 }')

log "CPU Usage: ${CPU_USAGE}%"
log "Memory: $MEMORY_INFO"
log "Disk: $DISK_INFO"
log "Load Average:$LOAD_AVERAGE"

# Container Performance
log "=== Container Performance ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" >> "$LOG_FILE"

# Application Response Times
PROD_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/api/health 2>/dev/null || echo "N/A")
STAGING_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8080/api/health 2>/dev/null || echo "N/A")
EXTERNAL_RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://addypin.com/api/health 2>/dev/null || echo "N/A")

log "Production API response: ${PROD_RESPONSE_TIME}s"
log "Staging API response: ${STAGING_RESPONSE_TIME}s"
log "External domain response: ${EXTERNAL_RESPONSE_TIME}s"

echo "" >> "$LOG_FILE"
PERF_SCRIPT_END

# Move scripts to monitoring directory
sudo mv /tmp/daily-health-check.sh /opt/addypin-monitoring/
sudo mv /tmp/backup-script.sh /opt/addypin-monitoring/
sudo mv /tmp/performance-monitor.sh /opt/addypin-monitoring/

# Make scripts executable
sudo chmod +x /opt/addypin-monitoring/*.sh

# Create log files
sudo touch /var/log/addypin-health.log
sudo touch /var/log/addypin-backup.log
sudo touch /var/log/addypin-performance.log
sudo chmod 644 /var/log/addypin-*.log

# Install required packages
echo "📦 Installing required packages..."
if command -v yum >/dev/null 2>&1; then
    sudo yum install -y bc curl wget
elif command -v apt >/dev/null 2>&1; then
    sudo apt update && sudo apt install -y bc curl wget
fi

# Set up cron jobs
echo "⏰ Setting up cron jobs..."
(crontab -l 2>/dev/null || true; cat << 'CRON_END'

# AddyPin Monitoring Cron Jobs
# Daily health check at 6:00 AM
0 6 * * * /opt/addypin-monitoring/daily-health-check.sh

# Performance monitoring every 15 minutes
*/15 * * * * /opt/addypin-monitoring/performance-monitor.sh

# Daily backup at 2:00 AM
0 2 * * * /opt/addypin-monitoring/backup-script.sh

CRON_END
) | crontab -

# Create simple dashboard
cat > /opt/addypin-monitoring/dashboard.sh << 'DASHBOARD_END'
#!/bin/bash
echo "============================================"
echo "         AddyPin Infrastructure Status"
echo "============================================"
echo "Generated: $(date)"
echo ""

echo "🐳 CONTAINER STATUS"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(addypin|postgres)"
echo ""

echo "🌐 SERVICE HEALTH"
echo -n "Production API: "
curl -f -s -m 5 http://localhost:3000/api/health > /dev/null && echo "✅ Healthy" || echo "❌ Failed"

echo -n "Production Domain: "
curl -f -s -m 10 https://addypin.com/api/health > /dev/null && echo "✅ Healthy" || echo "❌ Failed"
echo ""

echo "📊 SYSTEM OVERVIEW"
echo "Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "Memory: $(free -h | awk 'NR==2{printf "%s/%s (%.1f%%)", $3,$2,$3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}')"
echo ""

EXPOSED_PORTS=$(netstat -tlnp | grep -E ":3000|:8080|:5432" | grep -v "127.0.0.1" | wc -l)
if [ $EXPOSED_PORTS -eq 0 ]; then
    echo "🔒 Port Security: ✅ All ports localhost-only"
else
    echo "🔒 Port Security: ⚠️ $EXPOSED_PORTS exposed ports"
fi
DASHBOARD_END

sudo chmod +x /opt/addypin-monitoring/dashboard.sh

echo ""
echo "🎉 AddyPin Monitoring Suite Installation Complete!"
echo ""
echo "📋 Installed Components:"
echo "   ✅ Daily health checks (6:00 AM)"
echo "   ✅ Performance monitoring (every 15 minutes)"  
echo "   ✅ Daily backups (2:00 AM)"
echo ""
echo "📊 Quick Commands:"
echo "   Dashboard: /opt/addypin-monitoring/dashboard.sh"
echo "   Manual health check: /opt/addypin-monitoring/daily-health-check.sh"
echo "   Manual backup: /opt/addypin-monitoring/backup-script.sh"
echo ""
echo "📄 Log Files:"
echo "   Health: /var/log/addypin-health.log"
echo "   Performance: /var/log/addypin-performance.log"
echo "   Backup: /var/log/addypin-backup.log"
echo ""

# Run initial test
echo "🧪 Running initial dashboard test..."
/opt/addypin-monitoring/dashboard.sh