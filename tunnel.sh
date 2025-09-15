#!/bin/bash

VPS_IP="155.94.144.191"
LOCAL_PORT="5432"
REMOTE_PORT="5432"
PROJECT_NAME="addypin"

# Kill existing tunnel
pkill -f "ssh.*$VPS_IP.*$LOCAL_PORT" 2>/dev/null || true

echo "🔍 Testing SSH connection to $VPS_IP..."
if ! ssh -i ~/.ssh/${PROJECT_NAME}_replit -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$VPS_IP "echo 'SSH connection successful'"; then
    echo "❌ SSH connection failed"
    exit 1
fi

echo "🚇 Creating SSH tunnel..."
ssh -i ~/.ssh/${PROJECT_NAME}_replit -o StrictHostKeyChecking=no -N -L $LOCAL_PORT:localhost:$REMOTE_PORT root@$VPS_IP &

TUNNEL_PID=$!
echo $TUNNEL_PID > tunnel.pid

sleep 5

if kill -0 $TUNNEL_PID 2>/dev/null; then
    echo "✅ SSH tunnel established: localhost:$LOCAL_PORT -> $VPS_IP:$REMOTE_PORT"
    echo "🆔 Tunnel PID: $TUNNEL_PID"
else
    echo "❌ Failed to establish SSH tunnel"
    exit 1
fi
