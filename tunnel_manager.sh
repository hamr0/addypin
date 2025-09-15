#!/bin/bash
# tunnel_manager.sh - AddyPin SSH Tunnel Auto-Restart
# Based on successful Terribic implementation

echo "🔧 AddyPin SSH Tunnel Manager"
echo "=============================="

# ===== ADDYPIN CONFIGURATION =====
VPS_USER="root"
VPS_IP="155.94.144.191"
SSH_KEY_PATH="$HOME/.ssh/addypin_replit"
REMOTE_DB_PORT="5432"
LOCAL_TUNNEL_PORT="5432"
TUNNEL_LOG="tunnel.log"
DATABASE_NAME="addypin_dev"
DATABASE_USER="addypin_user"
DATABASE_PASSWORD="$ADDYPIN_DB_PASSWORD"  # From environment variable
# =================================

# Function to check if tunnel is alive
check_tunnel() {
    echo -n "🔍 Checking tunnel status... "
    
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
    
    # Start tunnel with nohup for persistence (Terribic method)
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
    sleep 3
    
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

# Function to test database connectivity
test_database() {
    echo "🧪 Testing AddyPin database connectivity..."
    
    if [ -z "$DATABASE_PASSWORD" ]; then
        echo "❌ ADDYPIN_DB_PASSWORD environment variable not set"
        return 1
    fi
    
    # Test PostgreSQL connection
    if PGPASSWORD="$DATABASE_PASSWORD" psql -h localhost -p $LOCAL_TUNNEL_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 'AddyPin DB Connected' as status;" 2>/dev/null | grep -q "AddyPin DB Connected"; then
        echo "✅ AddyPin PostgreSQL database connection successful"
        return 0
    else
        echo "❌ AddyPin database connection failed"
        echo "   Manual test: PGPASSWORD='***' psql -h localhost -p $LOCAL_TUNNEL_PORT -U $DATABASE_USER -d $DATABASE_NAME"
        return 1
    fi
}

# Main execution
echo "$(date): Starting AddyPin tunnel management..."

# Check if tunnel is running
if ! check_tunnel >/dev/null 2>&1; then
    echo "🔄 Tunnel not running, starting new one..."
    
    if start_tunnel; then
        echo ""
        echo "🏁 Tunnel management complete"
        check_tunnel
        test_database
    else
        echo ""
        echo "❌ Tunnel startup failed"
        echo "🔧 Troubleshooting:"
        echo "   1. SSH key: chmod 600 $SSH_KEY_PATH"
        echo "   2. VPS test: ssh -i $SSH_KEY_PATH $VPS_USER@$VPS_IP 'echo test'"
        echo "   3. Port check: lsof -i :$LOCAL_TUNNEL_PORT"
        echo "   4. Log: cat $TUNNEL_LOG"
        exit 1
    fi
else
    echo "✅ Tunnel already running"
    check_tunnel
    test_database
fi

echo ""
echo "✨ AddyPin SSH tunnel management complete!"
