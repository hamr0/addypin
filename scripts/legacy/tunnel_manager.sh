#!/bin/bash
# tunnel_manager.sh - SSH Tunnel with Secrets-based Key Reconstruction

echo "🔧 AddyPin SSH Tunnel Manager (Secrets Version)"
echo "================================================"
echo "$(date): Starting tunnel management..."

# Configuration - UPDATE THESE VALUES
VPS_USER="root"
VPS_IP="155.94.144.191"
SSH_KEY_PATH="$HOME/.ssh/addypin_replit"
REMOTE_DB_PORT="5432"
LOCAL_TUNNEL_PORT="5432"
DATABASE_NAME="addypin_dev"
DATABASE_USER="addypin_user"

# ⚡ CRITICAL: SSH Key Reconstruction from Secrets
echo "🔑 Setting up SSH key from Secrets..."

# Force-rebuild SSH key with proper PEM formatting
if [ -n "$ADDYPIN_SSH_PRIVATE_KEY" ]; then
    # Create .ssh directory if it doesn't exist
    mkdir -p ~/.ssh
    
    # Reconstruct key with proper formatting
    echo "-----BEGIN OPENSSH PRIVATE KEY-----" > "$SSH_KEY_PATH"
    echo "$ADDYPIN_SSH_PRIVATE_KEY" | fold -w 70 >> "$SSH_KEY_PATH"
    echo "-----END OPENSSH PRIVATE KEY-----" >> "$SSH_KEY_PATH"
    chmod 600 "$SSH_KEY_PATH"
    echo "✅ SSH key rebuilt"
else
    echo "❌ SSH key secret not found - check ADDYPIN_SSH_PRIVATE_KEY in Secrets"
    exit 1
fi

# Function to check if tunnel is alive
check_tunnel() {
    nc -z localhost $LOCAL_TUNNEL_PORT 2>/dev/null
}

# Function to start the tunnel
start_tunnel() {
    echo "🚀 Starting SSH tunnel..."
    echo "   Forwarding: localhost:$LOCAL_TUNNEL_PORT -> $VPS_IP:$REMOTE_DB_PORT"
    
    # Kill any existing processes
    pkill -f "ssh.*$VPS_IP.*$LOCAL_TUNNEL_PORT:localhost:$REMOTE_DB_PORT" 2>/dev/null
    
    # Start tunnel with enhanced security options
    nohup ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ExitOnForwardFailure=yes \
        -o ServerAliveInterval=60 \
        -o IdentitiesOnly=yes \
        -N -L $LOCAL_TUNNEL_PORT:localhost:$REMOTE_DB_PORT \
        $VPS_USER@$VPS_IP >/dev/null 2>&1 &
    
    local tunnel_pid=$!
    echo "   Started with PID: $tunnel_pid"
    sleep 2
    
    if check_tunnel; then
        echo "✅ Tunnel started successfully"
        return 0
    else
        echo "❌ Tunnel startup failed"
        return 1
    fi
}

# Function to test database connectivity
test_database() {
    echo "🧪 Testing database connectivity..."
    
    if command -v psql >/dev/null 2>&1 && [ -n "$POSTGRES_PASSWORD" ]; then
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p $LOCAL_TUNNEL_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 'Connected' as status;" 2>/dev/null | grep -q "Connected"; then
            echo "✅ Database connection successful"
            return 0
        fi
    fi
    
    echo "❌ Database connection failed"
    return 1
}

# Main execution
if ! check_tunnel; then
    echo "🔄 Tunnel not running, starting new one..."
    start_tunnel
else
    echo "✅ Tunnel already running, nothing to do"
fi

echo ""
echo "🏁 Tunnel management complete"
test_database
echo "✨ AddyPin SSH tunnel management complete!"
