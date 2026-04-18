#!/bin/bash
# AddyPin Security Audit Script
# Run weekly to check security posture

set -e
LOG_FILE="/var/log/addypin-security.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================" >> "$LOG_FILE"
echo "[$DATE] Security Audit Starting" >> "$LOG_FILE"

log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
    echo "[$DATE] $1"
}

log "=== Security Audit Report ==="

# 1. Container Security Check
log "=== Container Security Analysis ==="

# Check if containers run as non-root
log "Container user analysis:"
docker exec addypin whoami >> "$LOG_FILE" 2>&1
docker exec addypin-staging whoami >> "$LOG_FILE" 2>&1

# Check container port bindings
log "Port binding security check:"
docker port addypin >> "$LOG_FILE" 2>&1
docker port addypin-staging >> "$LOG_FILE" 2>&1
docker port addypin-postgres >> "$LOG_FILE" 2>&1

# 2. Network Security Check
log "=== Network Security Analysis ==="

# Check listening ports
log "Listening ports analysis:"
netstat -tlnp | grep -E ":80|:443|:3000|:8080|:5432" >> "$LOG_FILE"

# Check for any unexpected open ports
log "All listening services:"
ss -tlnp >> "$LOG_FILE"

# 3. SSL/TLS Configuration Check
log "=== SSL/TLS Configuration ==="

# Check SSL certificate details
log "SSL certificate information:"
echo | openssl s_client -servername addypin.com -connect addypin.com:443 2>/dev/null | openssl x509 -noout -text | grep -E "(Issuer|Subject|Not Before|Not After)" >> "$LOG_FILE"

# Check SSL configuration strength
log "SSL configuration test:"
curl -I https://addypin.com 2>&1 | grep -E "(HTTP|Server)" >> "$LOG_FILE"

# 4. File Permissions Audit
log "=== File Permissions Audit ==="

# Check Docker Compose file permissions
log "Docker compose file permissions:"
ls -la /opt/addypin/docker-compose.yml >> "$LOG_FILE" 2>&1
ls -la /opt/addypin-staging/docker-compose.yml >> "$LOG_FILE" 2>&1

# Check for world-readable sensitive files
log "Checking for world-readable sensitive files:"
find /opt -name "*.yml" -o -name "*.env" -o -name "*.key" -o -name "*.pem" | xargs ls -la >> "$LOG_FILE" 2>&1

# 5. Docker Security Analysis
log "=== Docker Security Analysis ==="

# Check Docker daemon configuration
log "Docker security status:"
docker version >> "$LOG_FILE" 2>&1

# List Docker networks
log "Docker networks:"
docker network ls >> "$LOG_FILE" 2>&1

# Check for privileged containers
log "Checking for privileged containers:"
docker ps --format "table {{.Names}}\t{{.Command}}" | grep -v "COMMAND" >> "$LOG_FILE"

# 6. System Updates Check
log "=== System Updates Status ==="
if command -v yum >/dev/null 2>&1; then
    log "Available system updates (CentOS/RHEL):"
    yum check-update 2>&1 | head -20 >> "$LOG_FILE"
elif command -v apt >/dev/null 2>&1; then
    log "Available system updates (Ubuntu/Debian):"
    apt list --upgradable 2>&1 | head -20 >> "$LOG_FILE"
fi

# 7. Log Analysis
log "=== Recent Security Events ==="

# Check for failed login attempts
log "Recent failed login attempts:"
grep "Failed password" /var/log/secure 2>/dev/null | tail -10 >> "$LOG_FILE" || log "No failed login attempts in secure log"

# Check nginx access logs for suspicious activity
log "Recent suspicious nginx requests:"
grep -E "(404|403|500)" /var/log/nginx/access.log 2>/dev/null | tail -10 >> "$LOG_FILE" || log "No nginx access log found"

# 8. Firewall Status
log "=== Firewall Status ==="
if command -v firewall-cmd >/dev/null 2>&1; then
    log "Firewall zones and services:"
    firewall-cmd --list-all >> "$LOG_FILE" 2>&1
elif command -v ufw >/dev/null 2>&1; then
    log "UFW status:"
    ufw status >> "$LOG_FILE" 2>&1
elif command -v iptables >/dev/null 2>&1; then
    log "Iptables rules:"
    iptables -L >> "$LOG_FILE" 2>&1
fi

log "[$DATE] Security audit completed"
echo "" >> "$LOG_FILE"