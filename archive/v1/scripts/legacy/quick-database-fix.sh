#!/bin/bash

# Quick Database Fix Script for AddyPin
# Purpose: Fast diagnosis and fix for "Creation failed" errors

echo "⚡ Quick AddyPin Database Fix"
echo "============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Quick status check
echo "1. 🔍 Quick Status Check:"
curl -s http://localhost:5000/api/stats | grep -q "Failed to fetch stats" && {
    echo -e "${RED}❌ Database is offline - Neon endpoint disabled${NC}"
    echo "   Error: 'The endpoint has been disabled. Enable it using Neon API and retry.'"
} || {
    echo -e "${GREEN}✅ Database appears to be working${NC}"
}

echo
echo "2. 🎯 Root Cause:"
echo "   Your Neon database endpoint has been suspended/disabled."
echo "   Endpoint: ep-dawn-butterfly-a5g5uej0.us-east-2.aws.neon.tech"

echo
echo "3. 🔧 IMMEDIATE FIX:"
echo -e "${YELLOW}   → Go to: https://console.neon.tech${NC}"
echo "   → Find project: ep-dawn-butterfly-a5g5uej0"
echo "   → Click 'Resume' or 'Activate' button"
echo "   → Wait 1-2 minutes for activation"

echo
echo "4. 🧪 Test After Fix:"
echo "   Run this command to test: curl -s http://localhost:5000/api/stats"
echo "   Success = JSON response with stats"
echo "   Still failing = 'Failed to fetch stats' message"

echo
echo "5. 📞 If Still Broken:"
echo "   → Check Neon project billing/limits"
echo "   → Contact Neon support with endpoint ID"
echo "   → Consider creating new database"

echo
echo -e "${YELLOW}💡 TIP: Bookmark this script for future database issues!${NC}"