#!/bin/bash
# tunnel_manager.sh - Auto-restart SSH Tunnel for AddyPin Database
# Adapted from Terribic Unified API successful implementation

echo "🔧 AddyPin SSH Tunnel Manager"
echo "============================="

# ===== CONFIGURATION - UPDATE THESE VALUES =====
VPS_USER="root"                        # Your VPS username
VPS_IP="155.94.144.191"               # Your VPS IP address
SSH_KEY_PATH="$HOME/.ssh/addypin_replit"  # SSH key path
REMOTE_DB_PORT="5432"                 # Database port on VPS (PostgreSQL: 5432)
LOCAL_TUNNEL_PORT="5432"              # Local port to forward to
TUNNEL_LOG="tunnel.log"               # Log file for debugging
DATABASE_NAME="addypin"               # Database name
DATABASE_USER="addypin_user"          # Database user
DATABASE_PASSWORD=""                  # Will extract from DATABASE_URL
# ==============================================

# Function to check if tunnel is alive
check_tunnel() {
    echo -n "🔍 Checking tunnel status... "
    
    # Check if local port is open using netcat
    if nc -z localhost $LOCAL_TUNNEL_PORT 2>/dev/null; then
        echo "✅ ACTIVE (port $LOCAL_TUNNEL_PORT open)"
        return 0
    else
        echo "❌ DOWN (port $LOCAL_TUNNEL_PORT closed)"
        return 1
    fi
}

# Function to start the tunnel
start_tunnel() {
    echo "🚀 Starting SSH tunnel..."
    echo "   Forwarding: localhost:$LOCAL_TUNNEL_PORT -> $VPS_IP:$REMOTE_DB_PORT"
    
    # Kill any existing SSH processes to avoid conflicts
    pkill -f "ssh.*$VPS_IP.*$LOCAL_TUNNEL_PORT:localhost:$REMOTE_DB_PORT" 2>/dev/null
    
    # Start tunnel with nohup for persistence
    nohup ssh -i $SSH_KEY_PATH \
        -o StrictHostKeyChecking=no \
        -o ExitOnForwardFailure=yes \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -N -L $LOCAL_TUNNEL_PORT:localhost:$REMOTE_DB_PORT \
        $VPS_USER@$VPS_IP > $TUNNEL_LOG 2>&1 &
    
    local tunnel_pid=$!
    echo "   Started with PID: $tunnel_pid"
    
    # Give it time to establish
    sleep 2
    
    # Verify it started successfully
    if check_tunnel >/dev/null 2>&1; then
        echo "✅ Tunnel started successfully"
        return 0
    else
        echo "❌ Failed to start tunnel"
        echo "   Check $TUNNEL_LOG for details:"
        tail -5 $TUNNEL_LOG 2>/dev/null || echo "   No log file found"
        return 1
    fi
}

# Function to show comprehensive status
show_status() {
    echo ""
    echo "📊 Current Status:"
    echo "   SSH Key: $(test -f $SSH_KEY_PATH && echo "✅ Present" || echo "❌ Missing")"
    echo "   VPS: $VPS_USER@$VPS_IP"
    echo "   Local Port: $LOCAL_TUNNEL_PORT"
    echo "   Remote Port: $REMOTE_DB_PORT"
    check_tunnel
    echo ""
}

# Main execution flow
echo "$(date): Starting tunnel management..."

# Show current status
show_status

# Check if tunnel is running
if ! check_tunnel >/dev/null 2>&1; then
    echo "🔄 Tunnel not running, starting new one..."
    start_tunnel
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🏁 Tunnel management complete"
        show_status
    else
        echo ""
        echo "❌ Tunnel startup failed"
        echo "🔧 Troubleshooting tips:"
        echo "   1. Check SSH key permissions: chmod 600 $SSH_KEY_PATH"
        echo "   2. Test VPS connectivity: ssh -i $SSH_KEY_PATH $VPS_USER@$VPS_IP 'echo test'"
        echo "   3. Check if port $LOCAL_TUNNEL_PORT is already in use: lsof -i :$LOCAL_TUNNEL_PORT"
        echo "   4. Review tunnel log: cat $TUNNEL_LOG"
        exit 1
    fi
else
    echo "✅ Tunnel already running, nothing to do"
    echo ""
    echo "🏁 Tunnel management complete"
    show_status
fi

echo ""
echo "✨ AddyPin SSH tunnel management complete!"
