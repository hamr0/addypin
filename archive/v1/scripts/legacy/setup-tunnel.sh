#!/bin/bash
# SSH Tunnel Setup for Local Development
# Connects to VPS PostgreSQL via SSH tunnel on localhost:5432

VPS_HOST="155.94.144.191"
VPS_USER="root"
LOCAL_PORT=5432
REMOTE_PORT=5432

echo "🔧 Setting up SSH tunnel to VPS PostgreSQL..."

# Check if tunnel already exists
if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Tunnel already active on port ${LOCAL_PORT}"
    exit 0
fi

# Start SSH tunnel in background
echo "🚀 Starting SSH tunnel: localhost:${LOCAL_PORT} → ${VPS_HOST}:${REMOTE_PORT}"

# Option 1: With SSH key from Secrets (if available)
if [ -n "$ADDYPIN_SSH_PRIVATE_KEY" ]; then
    echo "$ADDYPIN_SSH_PRIVATE_KEY" > /tmp/tunnel_key
    chmod 600 /tmp/tunnel_key
    ssh -i /tmp/tunnel_key \
        -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} \
        -N -f \
        -o StrictHostKeyChecking=no \
        ${VPS_USER}@${VPS_HOST}
    rm /tmp/tunnel_key
else
    # Option 2: Interactive (will prompt for password/key)
    ssh -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} \
        -N -f \
        -o StrictHostKeyChecking=no \
        ${VPS_USER}@${VPS_HOST}
fi

# Verify tunnel
sleep 2
if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Tunnel established successfully!"
    echo "📍 PostgreSQL accessible at: localhost:${LOCAL_PORT}"
else
    echo "❌ Tunnel failed to establish"
    exit 1
fi