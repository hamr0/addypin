#!/bin/bash

# 🔐 VPS SSH Health Check
# Tests SSH service health from VPS perspective

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
LOG_FILE="/var/log/addypin-ssh-health.log"

ssh_health_check() {
    echo -e "${CYAN}🔐 VPS SSH Health Check${NC}"
    echo "=============================="
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "📅 $timestamp"
    echo ""
    
    local all_healthy=true
    
    # 1. SSH Daemon Status
    echo -e "${BLUE}🔍 Checking SSH Daemon...${NC}"
    
    if systemctl is-active sshd >/dev/null 2>&1; then
        echo "✅ SSH Daemon: Running"
        
        # Get SSH daemon details
        local ssh_pid=$(systemctl show sshd -p MainPID --value)
        local ssh_uptime=$(ps -o etime= -p $ssh_pid 2>/dev/null | tr -d ' ' || echo "unknown")
        echo "📊 Process ID: $ssh_pid | Uptime: $ssh_uptime"
    else
        echo -e "${RED}❌ SSH Daemon: Failed${NC}"
        all_healthy=false
    fi
    
    # 2. SSH Port Check
    echo ""
    echo -e "${BLUE}🌐 Checking SSH Port...${NC}"
    
    if netstat -ln | grep -q ":22 "; then
        echo "✅ SSH Port 22: Listening"
        
        # Show listening details
        local ssh_listeners=$(netstat -ln | grep ":22 " | wc -l)
        echo "📊 Active listeners: $ssh_listeners"
    else
        echo -e "${RED}❌ SSH Port 22: Not listening${NC}"
        all_healthy=false
    fi
    
    # 3. SSH Configuration Test
    echo ""
    echo -e "${BLUE}⚙️ Checking SSH Configuration...${NC}"
    
    if sshd -t 2>/dev/null; then
        echo "✅ SSH Config: Valid syntax"
        
        # Check key settings
        local password_auth=$(sshd -T 2>/dev/null | grep "^passwordauthentication" | awk '{print $2}')
        local pubkey_auth=$(sshd -T 2>/dev/null | grep "^pubkeyauthentication" | awk '{print $2}')
        local root_login=$(sshd -T 2>/dev/null | grep "^permitrootlogin" | awk '{print $2}')
        
        echo "📊 Password Auth: $password_auth | Pubkey Auth: $pubkey_auth | Root Login: $root_login"
    else
        echo -e "${RED}❌ SSH Config: Syntax errors detected${NC}"
        all_healthy=false
    fi
    
    # 4. Recent SSH Activity
    echo ""
    echo -e "${BLUE}📈 Recent SSH Activity...${NC}"
    
    if [[ -f "/var/log/auth.log" ]]; then
        # Count recent successful logins (last hour)
        local recent_logins=$(grep "$(date '+%b %d %H:' -d '1 hour ago')" /var/log/auth.log 2>/dev/null | grep -c "Accepted" || echo "0")
        local recent_failures=$(grep "$(date '+%b %d %H:' -d '1 hour ago')" /var/log/auth.log 2>/dev/null | grep -c "Failed password" || echo "0")
        
        echo "✅ Recent Activity: $recent_logins successful, $recent_failures failed (last hour)"
        
        # Show last successful connection
        local last_success=$(grep "Accepted" /var/log/auth.log 2>/dev/null | tail -1 | awk '{print $1,$2,$3}' || echo "none")
        echo "📊 Last Success: $last_success"
        
        if [[ $recent_failures -gt 10 ]]; then
            echo -e "${YELLOW}⚠️ High number of failed attempts detected${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Auth log not accessible${NC}"
    fi
    
    # 5. SSH Key Directory Check
    echo ""
    echo -e "${BLUE}🔑 SSH Key Environment...${NC}"
    
    if [[ -d "/root/.ssh" ]]; then
        local key_count=$(ls -1 /root/.ssh/*.pub 2>/dev/null | wc -l || echo "0")
        local authorized_keys=$(wc -l < /root/.ssh/authorized_keys 2>/dev/null || echo "0")
        
        echo "✅ SSH Keys: $key_count public keys, $authorized_keys authorized"
        
        # Check permissions on .ssh directory
        local ssh_perms=$(stat -c %a /root/.ssh 2>/dev/null)
        if [[ "$ssh_perms" == "700" ]]; then
            echo "✅ Permissions: /root/.ssh ($ssh_perms) - secure"
        else
            echo -e "${YELLOW}⚠️ Permissions: /root/.ssh ($ssh_perms) - should be 700${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ SSH directory: /root/.ssh not found${NC}"
    fi
    
    # 6. SSH Process Resources
    echo ""
    echo -e "${BLUE}📊 SSH Resource Usage...${NC}"
    
    if systemctl is-active sshd >/dev/null 2>&1; then
        local ssh_processes=$(pgrep -c sshd || echo "0")
        local ssh_memory=$(ps -o pid,pmem,comm | grep sshd | awk '{sum+=$2} END {printf "%.1f", sum}' || echo "0.0")
        
        echo "✅ SSH Processes: $ssh_processes active"
        echo "📊 Memory Usage: ${ssh_memory}%"
    fi
    
    # 7. Summary
    echo ""
    echo "=============================="
    if [ "$all_healthy" = true ]; then
        echo -e "${GREEN}✅ SSH STATUS: HEALTHY${NC}"
        echo "🎉 SSH service fully operational"
    else
        echo -e "${RED}❌ SSH STATUS: ISSUES DETECTED${NC}"
        echo "🚨 SSH service needs attention"
    fi
    echo ""
    
    # Log the result
    echo "[$timestamp] SSH health check: $([ "$all_healthy" = true ] && echo "HEALTHY" || echo "ISSUES")" >> "$LOG_FILE"
}

# Quick SSH status
quick_ssh_status() {
    local daemon_status="❌"
    local port_status="❌"
    local config_status="❌"
    
    systemctl is-active sshd >/dev/null 2>&1 && daemon_status="✅"
    netstat -ln | grep -q ":22 " && port_status="✅"
    sshd -t 2>/dev/null && config_status="✅"
    
    echo "🔐 SSH Status: Daemon $daemon_status | Port $port_status | Config $config_status"
}

# Main execution
case "${1:-check}" in
    "check"|"")
        ssh_health_check
        ;;
    "quick")
        quick_ssh_status
        ;;
    *)
        echo "Usage: ssh-health [quick]"
        ;;
esac
