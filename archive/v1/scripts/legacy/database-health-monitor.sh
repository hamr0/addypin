#!/bin/bash

# AddyPin Database Health Monitor
# Purpose: Continuously monitor database status and alert on issues

LOG_FILE="database-monitor.log"
ALERT_EMAIL="your-email@example.com"  # Update this with your email

echo "🔍 AddyPin Database Health Monitor Started"
echo "Monitoring database connectivity every 60 seconds..."
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to test database
test_database() {
    local response=$(curl -s http://localhost:5000/api/stats 2>/dev/null)
    
    if echo "$response" | grep -q "Failed to fetch stats"; then
        return 1  # Database offline
    elif [ -z "$response" ]; then
        return 2  # Server offline
    else
        return 0  # Database online
    fi
}

# Function to test pin creation
test_pin_creation() {
    local response=$(curl -s -X POST "http://localhost:5000/api/pins" \
        -H "Content-Type: application/json" \
        -d '{"latitude":"52.2","longitude":"4.7","title":"Health Check"}' 2>/dev/null)
    
    if echo "$response" | grep -q "Failed to create pin"; then
        return 1  # Pin creation failing
    else
        return 0  # Pin creation working
    fi
}

# Initialize monitoring
log_message "🚀 Database health monitoring started"
LAST_STATUS="unknown"
FAILURE_COUNT=0

while true; do
    test_database
    DB_STATUS=$?
    
    case $DB_STATUS in
        0)
            STATUS="ONLINE"
            if [ "$LAST_STATUS" != "ONLINE" ]; then
                log_message "✅ Database is ONLINE - AddyPin working normally"
                FAILURE_COUNT=0
            fi
            ;;
        1)
            STATUS="DATABASE_OFFLINE"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            log_message "❌ Database OFFLINE - Neon endpoint disabled (failure #$FAILURE_COUNT)"
            ;;
        2)
            STATUS="SERVER_OFFLINE"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            log_message "🔴 Server OFFLINE - AddyPin not responding (failure #$FAILURE_COUNT)"
            ;;
    esac
    
    # Test pin creation if database is online
    if [ $DB_STATUS -eq 0 ]; then
        test_pin_creation
        PIN_STATUS=$?
        if [ $PIN_STATUS -eq 1 ] && [ "$LAST_STATUS" = "ONLINE" ]; then
            log_message "⚠️  Pin creation failing despite database being online"
        fi
    fi
    
    # Alert after 3 consecutive failures
    if [ $FAILURE_COUNT -ge 3 ] && [ "$LAST_STATUS" != "$STATUS" ]; then
        log_message "🚨 ALERT: Database has been down for 3+ checks - requires attention"
        
        # You can add email alerting here if needed
        # echo "Database offline for 3+ minutes" | mail -s "AddyPin Database Alert" "$ALERT_EMAIL"
    fi
    
    LAST_STATUS="$STATUS"
    
    # Show current status briefly
    case $STATUS in
        "ONLINE") echo -n "." ;;
        "DATABASE_OFFLINE") echo -n "X" ;;
        "SERVER_OFFLINE") echo -n "!" ;;
    esac
    
    sleep 60
done