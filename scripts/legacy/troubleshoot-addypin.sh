#!/bin/bash

# AddyPin Database Troubleshooting Script
# Created: $(date)
# Purpose: Diagnose and fix "Creation failed" errors

echo "🔧 AddyPin Database Troubleshooting Script"
echo "=========================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Function to check database connectivity
check_database() {
    print_status "INFO" "Testing database connectivity..."
    
    # Extract database info from .env
    if [ -f ".env" ]; then
        DB_URL=$(grep "DATABASE_URL" .env | cut -d '=' -f2- | tr -d '"')
        if [ -n "$DB_URL" ]; then
            echo "Database URL: ${DB_URL:0:50}..."
            
            # Parse the URL to get host
            DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
            print_status "INFO" "Database Host: $DB_HOST"
            
            # Test network connectivity to host
            if ping -c 1 -W 3 "$DB_HOST" &> /dev/null; then
                print_status "SUCCESS" "Network connectivity to database host is working"
            else
                print_status "ERROR" "Cannot reach database host: $DB_HOST"
            fi
        else
            print_status "ERROR" "DATABASE_URL not found in .env file"
        fi
    else
        print_status "ERROR" ".env file not found"
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    print_status "INFO" "Testing AddyPin API endpoints..."
    
    BASE_URL="http://localhost:5000"
    
    # Test health endpoint
    echo "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null)
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        print_status "SUCCESS" "Health endpoint is working"
    else
        print_status "ERROR" "Health endpoint failed (HTTP: $HEALTH_RESPONSE)"
    fi
    
    # Test stats endpoint (this should fail with database issues)
    echo "Testing stats endpoint..."
    STATS_RESPONSE=$(curl -s "$BASE_URL/api/stats" 2>/dev/null)
    if echo "$STATS_RESPONSE" | grep -q "Failed to fetch stats"; then
        print_status "ERROR" "Stats endpoint failing - confirms database issue"
        print_status "INFO" "Response: $STATS_RESPONSE"
    else
        print_status "SUCCESS" "Stats endpoint is working"
    fi
    
    # Test pin creation (should fail)
    echo "Testing pin creation..."
    PIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pins" \
        -H "Content-Type: application/json" \
        -d '{"latitude":"52.2","longitude":"4.7","title":"Test Pin"}' 2>/dev/null)
    
    if echo "$PIN_RESPONSE" | grep -q "Failed to create pin"; then
        print_status "ERROR" "Pin creation failing - confirms database issue"
        print_status "INFO" "Response: $PIN_RESPONSE"
    else
        print_status "SUCCESS" "Pin creation is working"
    fi
}

# Function to check logs for database errors
check_logs() {
    print_status "INFO" "Analyzing recent logs for database errors..."
    
    # Check for common database error patterns
    LOG_DIR="/tmp/logs"
    if [ -d "$LOG_DIR" ]; then
        LATEST_LOG=$(find "$LOG_DIR" -name "Start_application_*.log" | sort | tail -1)
        if [ -n "$LATEST_LOG" ] && [ -f "$LATEST_LOG" ]; then
            print_status "INFO" "Checking log file: $LATEST_LOG"
            
            # Look for specific database errors
            if grep -q "endpoint has been disabled" "$LATEST_LOG"; then
                print_status "ERROR" "DATABASE ENDPOINT DISABLED - This is the root cause!"
                echo "   Found error: 'The endpoint has been disabled. Enable it using Neon API and retry.'"
            fi
            
            if grep -q "Failed to create pin" "$LATEST_LOG"; then
                print_status "ERROR" "Pin creation failures detected in logs"
            fi
            
            if grep -q "Failed to fetch stats" "$LATEST_LOG"; then
                print_status "ERROR" "Stats fetching failures detected in logs"
            fi
        fi
    fi
}

# Function to provide solutions
provide_solutions() {
    print_status "INFO" "🔨 SOLUTIONS TO FIX THE ISSUE:"
    echo
    echo "1. 🔄 REACTIVATE NEON DATABASE:"
    echo "   - Log in to your Neon Console: https://console.neon.tech"
    echo "   - Find your project with endpoint: ep-dawn-butterfly-a5g5uej0"
    echo "   - Check if the project is suspended/paused"
    echo "   - Click 'Resume' or 'Activate' to reactivate the endpoint"
    echo
    echo "2. 📋 CHECK NEON PROJECT STATUS:"
    echo "   - Verify your Neon project hasn't exceeded limits"
    echo "   - Check if you need to upgrade your plan"
    echo "   - Review any billing issues"
    echo
    echo "3. 🔧 TEMPORARY WORKAROUND:"
    echo "   - Create a new Neon database"
    echo "   - Update DATABASE_URL in .env file"
    echo "   - Run database migrations: npm run db:push"
    echo
    echo "4. 📞 CONTACT SUPPORT:"
    echo "   - If the issue persists, contact Neon support"
    echo "   - Reference endpoint: ep-dawn-butterfly-a5g5uej0.us-east-2.aws.neon.tech"
    echo
}

# Function to monitor database status
monitor_database() {
    print_status "INFO" "🔍 MONITORING DATABASE STATUS"
    echo "This will check database status every 30 seconds..."
    echo "Press Ctrl+C to stop monitoring"
    echo
    
    while true; do
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$TIMESTAMP] Testing database..."
        
        STATS_RESPONSE=$(curl -s "http://localhost:5000/api/stats" 2>/dev/null)
        if echo "$STATS_RESPONSE" | grep -q "Failed to fetch stats"; then
            print_status "ERROR" "Database still offline"
        else
            print_status "SUCCESS" "Database is back online!"
            break
        fi
        
        sleep 30
    done
}

# Main execution
main() {
    echo "Starting comprehensive database troubleshooting..."
    echo
    
    check_database
    echo
    
    test_api_endpoints
    echo
    
    check_logs
    echo
    
    provide_solutions
    
    echo
    read -p "Would you like to monitor database status? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        monitor_database
    fi
    
    print_status "INFO" "Troubleshooting complete. Follow the solutions above to fix the issue."
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi