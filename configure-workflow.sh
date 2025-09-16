#!/bin/bash

echo "🔧 CONFIGURING ADDYPIN WORKFLOW WITH TERRIBIC METHOD"
echo "=================================================="

# Step 1: Kill any existing tunnels to start fresh
echo "1. Cleaning up existing tunnels..."
pkill -f "ssh.*155.94.144.191" 2>/dev/null && echo "   ✅ Old tunnels killed" || echo "   ℹ️  No old tunnels to kill"

# Step 2: Stop current workflow
echo "2. Stopping current workflow..."
echo "   ⏹️  You need to manually stop the 'Start application' workflow in Replit"
echo "   ⏹️  Go to Workflows tool and click Stop on 'Start application'"

# Step 3: Test tunnel manager works
echo "3. Testing tunnel manager..."
export ADDYPIN_DB_PASSWORD="UBih+0YllInCRul3liIlMXHiezktiq8vGXbZ9CiAljA="
./tunnel_manager.sh &
TUNNEL_PID=$!
sleep 5

if nc -zv localhost 5432 2>/dev/null; then
    echo "   ✅ Tunnel manager working perfectly"
    kill $TUNNEL_PID 2>/dev/null
else
    echo "   ❌ Tunnel manager failed"
    kill $TUNNEL_PID 2>/dev/null
    exit 1
fi

# Step 4: Show the exact workflow command
echo ""
echo "4. WORKFLOW COMMAND TO USE:"
echo "=========================="
echo 'bash -c "export ADDYPIN_DB_PASSWORD=\"UBih+0YllInCRul3liIlMXHiezktiq8vGXbZ9CiAljA=\" && ./tunnel_manager.sh && npm run dev"'
echo ""
echo "5. MANUAL STEPS:"
echo "==============="
echo "   a) Stop the 'Start application' workflow"
echo "   b) Go to Workflows tool → Edit 'Start application'"
echo "   c) Change command from 'npm run dev' to the command above"
echo "   d) Save and restart workflow"
echo ""
echo "6. VERIFICATION COMMAND:"
echo "======================"
echo "./verify-terribic-method.sh"

echo ""
echo "🎯 After these steps, your AddyPin will be bulletproof like Terribic!"