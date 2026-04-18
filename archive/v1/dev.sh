#!/bin/bash
# AddyPin Local Development - Start Script
#
# Usage: ./dev.sh
#
# What it does:
# 1. Establishes SSH tunnel to VPS PostgreSQL (localhost:5432 → VPS:5432)
# 2. Installs dependencies (if needed)
# 3. Starts dev server on http://localhost:5000
#
# Frontend: http://localhost:5000
# API: http://localhost:5000/api/*
# Health: http://localhost:5000/api/health
#
# Stop: Press Ctrl+C or run ./dev-stop.sh

set -e

VPS_HOST="155.94.144.191"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/vps_tunnel_key"
LOCAL_PORT=5432
REMOTE_PORT=5432

echo "🚀 Starting AddyPin Development Environment"
echo ""

# 1. Check if SSH tunnel is already running
if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ SSH tunnel already active on port ${LOCAL_PORT}"
else
    echo "🔐 Establishing SSH tunnel to VPS PostgreSQL..."

    if [ ! -f "$SSH_KEY" ]; then
        echo "❌ SSH key not found at $SSH_KEY"
        echo "💡 Run setup on VPS first or check key location"
        exit 1
    fi

    # Start SSH tunnel in background
    ssh -i "$SSH_KEY" \
        -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} \
        -N -f \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=60 \
        ${VPS_USER}@${VPS_HOST}

    sleep 2

    if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "✅ SSH tunnel established successfully"
    else
        echo "❌ Failed to establish SSH tunnel"
        exit 1
    fi
fi

echo ""
echo "📦 Installing dependencies (if needed)..."
npm install --silent

echo ""
echo "🔨 Starting development server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start dev server (not in background - so you can see logs)
npm run dev