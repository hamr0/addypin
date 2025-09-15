#!/bin/bash

# 🔐 AddyPin SSH Tunnel Monitor
# Dedicated monitoring script for SSH tunnel connectivity
# Usage: ./scripts/ssh-tunnel-monitor.sh

set -e

echo "🔐 AddyPin SSH Tunnel Monitor - $(date)"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="155.94.144.191"
TUNNEL_PORT="5432"
LOG_FILE="/var/log/addypin/ssh-tunnel-monitor.log"

# Create log directory if it doesn't exist
mkdir -p /var/log/addypin 2>/dev/null || true

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_tunnel_processes() {
    echo "🔍 Checking SSH tunnel processes..."
    
    local tunnel_processes=$(ps aux | grep -v grep | grep "ssh.*$VPS_HOST.*$TUNNEL_PORT")
    local tunnel_count=$(echo "$tunnel_processes" | grep -c . 2>/dev/null || echo "0")
    
    if [ $tunnel_count -gt 0 ]; then
        echo -e "${GREEN}✅ Found $tunnel_count SSH tunnel process(es):${NC}"
        echo "$tunnel_processes" | while read line; do
            local pid=$(echo "$line" | awk '{print $2}')
            local user=$(echo "$line" | awk '{print $1}')
            local runtime=$(ps -o etime= -p $pid 2>/dev/null | tr -d ' ')
            echo -e "${BLUE}   └─ PID: $pid | User: $user | Runtime: $runtime${NC}"
        done
        log_message "SSH tunnel processes detected: $tunnel_count active"
        return 0
    else
        echo -e "${YELLOW}⚠️ No SSH tunnel processes found${NC}"
        log_message "No SSH tunnel processes detected"
        return 1
    fi
}

test_tunnel_connectivity() {
    echo "🧪 Testing tunnel connectivity..."
    
    if nc -z localhost $TUNNEL_PORT 2>/dev/null; then
        echo -e "${GREEN}✅ Port $TUNNEL_PORT is accessible on localhost${NC}"
        log_message "SSH tunnel connectivity verified - port $TUNNEL_PORT accessible"
        
        # Test actual database connection if possible
        if command -v psql >/dev/null 2>&1; then
            echo "🗄️ Testing database connection through tunnel..."
            
            # Try to connect to development database
            if PGPASSWORD="${ADDYPIN_DB_PASSWORD}" psql -h localhost -p $TUNNEL_PORT -U addypin_user -d addypin_dev -c "SELECT 1;" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Database connection through tunnel: SUCCESS${NC}"
                log_message "Database connection through SSH tunnel verified"
            elif PGPASSWORD="${ADDYPIN_DB_PASSWORD}" psql -h localhost -p $TUNNEL_PORT -U addypin_user -d addypin -c "SELECT 1;" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Database connection through tunnel: SUCCESS (production DB)${NC}"
                log_message "Database connection through SSH tunnel verified (production)"
            else
                echo -e "${YELLOW}⚠️ Port accessible but database connection failed${NC}"
                log_message "SSH tunnel port accessible but database connection failed"
            fi
        else
            echo -e "${BLUE}ℹ️ psql not available for database connection test${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Port $TUNNEL_PORT is not accessible on localhost${NC}"
        log_message "SSH tunnel connectivity failed - port $TUNNEL_PORT not accessible"
        return 1
    fi
}

check_ssh_key() {
    echo "🔑 Checking SSH key configuration..."
    
    local ssh_key="$HOME/.ssh/addypin_replit"
    
    if [ -f "$ssh_key" ]; then
        local permissions=$(stat -c %a "$ssh_key" 2>/dev/null)
        if [ "$permissions" = "600" ]; then
            echo -e "${GREEN}✅ SSH key exists with correct permissions ($permissions)${NC}"
            log_message "SSH key configuration verified"
            return 0
        else
            echo -e "${YELLOW}⚠️ SSH key exists but has incorrect permissions: $permissions (should be 600)${NC}"
            log_message "SSH key permissions incorrect: $permissions"
            return 1
        fi
    else
        echo -e "${RED}❌ SSH key not found at $ssh_key${NC}"
        log_message "SSH key not found"
        return 1
    fi
}

test_ssh_connectivity() {
    echo "🌐 Testing SSH connectivity to VPS..."
    
    local ssh_key="$HOME/.ssh/addypin_replit"
    
    if [ -f "$ssh_key" ]; then
        if ssh -i "$ssh_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$VPS_HOST "echo 'SSH connectivity test successful'" 2>/dev/null; then
            echo -e "${GREEN}✅ SSH connectivity to VPS: SUCCESS${NC}"
            log_message "SSH connectivity to VPS verified"
            return 0
        else
            echo -e "${RED}❌ SSH connectivity to VPS: FAILED${NC}"
            log_message "SSH connectivity to VPS failed"
            return 1
        fi
    else
        echo -e "${RED}❌ Cannot test SSH connectivity - key not found${NC}"
        log_message "SSH connectivity test skipped - key not found"
        return 1
    fi
}

generate_tunnel_report() {
    echo ""
    echo "📊 SSH Tunnel Health Report"
    echo "==========================================="
    
    local overall_status="HEALTHY"
    local issues=()
    
    # Check all components
    check_tunnel_processes || { overall_status="DEGRADED"; issues+=("No tunnel processes"); }
    echo ""
    
    test_tunnel_connectivity || { overall_status="UNHEALTHY"; issues+=("Port not accessible"); }
    echo ""
    
    check_ssh_key || { overall_status="DEGRADED"; issues+=("SSH key issues"); }
    echo ""
    
    test_ssh_connectivity || { overall_status="DEGRADED"; issues+=("SSH connectivity issues"); }
    echo ""
    
    # Final report
    echo "==========================================="
    case $overall_status in
        "HEALTHY")
            echo -e "${GREEN}🎉 OVERALL STATUS: HEALTHY${NC}"
            echo -e "${GREEN}All SSH tunnel components are functioning properly${NC}"
            log_message "SSH tunnel health check completed - HEALTHY"
            return 0
            ;;
        "DEGRADED")
            echo -e "${YELLOW}⚠️ OVERALL STATUS: DEGRADED${NC}"
            echo -e "${YELLOW}Issues detected: ${issues[*]}${NC}"
            log_message "SSH tunnel health check completed - DEGRADED: ${issues[*]}"
            return 1
            ;;
        "UNHEALTHY")
            echo -e "${RED}❌ OVERALL STATUS: UNHEALTHY${NC}"
            echo -e "${RED}Critical issues: ${issues[*]}${NC}"
            log_message "SSH tunnel health check completed - UNHEALTHY: ${issues[*]}"
            return 2
            ;;
    esac
}

# Main execution
main() {
    # Create log file if it doesn't exist
    touch "$LOG_FILE" 2>/dev/null || LOG_FILE="./ssh-tunnel-monitor.log"
    
    log_message "SSH tunnel monitoring started"
    
    # Generate comprehensive report
    generate_tunnel_report
    local exit_code=$?
    
    log_message "SSH tunnel monitoring completed with exit code $exit_code"
    
    return $exit_code
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--help|--processes|--connectivity|--report]"
        echo ""
        echo "Options:"
        echo "  --help        Show this help message"
        echo "  --processes   Check tunnel processes only"
        echo "  --connectivity Test tunnel connectivity only"
        echo "  --report      Generate full health report (default)"
        echo ""
        exit 0
        ;;
    --processes)
        check_tunnel_processes
        exit $?
        ;;
    --connectivity)
        test_tunnel_connectivity
        exit $?
        ;;
    --report|"")
        main
        exit $?
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac