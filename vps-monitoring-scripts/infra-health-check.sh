#!/bin/bash

# Infrastructure Health Check Script
LOG_FILE="/var/log/infra-health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

{
    echo "=== Health Check Started at $TIMESTAMP ==="

    # 1. Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running."
    else
        echo "❌ NGINX IS DOWN! Attempting to restart..."
        systemctl restart nginx
        sleep 2
        if systemctl is-active --quiet nginx; then
            echo "✅ Nginx restarted successfully."
            # SEND ALERT: "Nginx was down but has been restarted automatically."
        else
            echo "❌ NGINX FAILED TO RESTART!"
            # SEND ALERT: "CRITICAL: Nginx is down and could not be restarted!"
        fi
    fi

    # 2. Check critical Docker containers
    SERVICES=("addypin" "addypin-staging" "addypin-postgres")
    for service in "${SERVICES[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^${service}$"; then
            echo "✅ Container '$service' is running."
        else
            echo "❌ CONTAINER '$service' IS DOWN!"
            # SEND ALERT: "Container $service is down!"
        fi
    done

    # 3. Check application health endpoints
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Production application health check passed."
    else
        echo "❌ PRODUCTION APPLICATION HEALTH CHECK FAILED!"
        # SEND ALERT: "Production application health check failed!"
    fi

    if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
        echo "✅ Staging application health check passed."
    else
        echo "❌ STAGING APPLICATION HEALTH CHECK FAILED!"
        # SEND ALERT: "Staging application health check failed!"
    fi

    echo "=== Health Check Finished at $(date '+%Y-%m-%d %H:%M:%S') ==="
    echo "" # Adds a blank line for readability
} | tee -a "$LOG_FILE" # Show on terminal AND log to file

# Optional: Rotate log file if it gets too large (e.g., > 10MB)
LOG_SIZE=$(wc -c < "$LOG_FILE")
if [ "$LOG_SIZE" -gt 10000000 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
fi