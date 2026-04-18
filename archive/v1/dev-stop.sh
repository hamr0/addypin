#!/bin/bash
# AddyPin Local Development - Stop Script
# Kills dev server and closes SSH tunnel

echo "🛑 Stopping AddyPin Development Environment"
echo ""

# 1. Kill dev server
echo "📦 Stopping dev server..."
pkill -f "tsx server/index.ts" 2>/dev/null && echo "✅ Dev server stopped" || echo "ℹ️  Dev server not running"
pkill -f "npm run dev" 2>/dev/null || true

# 2. Kill SSH tunnel
echo "🔐 Closing SSH tunnel..."
TUNNEL_PID=$(lsof -ti:5432 2>/dev/null)
if [ -n "$TUNNEL_PID" ]; then
    kill $TUNNEL_PID 2>/dev/null && echo "✅ SSH tunnel closed" || echo "⚠️  Failed to close tunnel (PID: $TUNNEL_PID)"
else
    echo "ℹ️  No SSH tunnel running on port 5432"
fi

echo ""
echo "✅ Development environment stopped"