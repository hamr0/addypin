#!/bin/bash
# start_with_tunnel.sh - Complete startup script with tunnel management
# Following the battle-tested guide exactly

echo "🚀 AddyPin Complete Startup with SSH Tunnel Management"
echo "====================================================="

# Run tunnel manager first (exactly as guide specifies)
./tunnel_manager.sh

# If tunnel manager succeeds, start the application
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tunnel management complete - starting application..."
    echo ""
    # Start the npm dev server
    npm run dev
else
    echo ""
    echo "❌ Tunnel management failed - cannot start application"
    exit 1
fi