#!/bin/bash
# Test deployment script - can be run to test the workflow

echo "=== TESTING DEPLOYMENT WORKFLOW ==="

echo "1. Testing GitHub repository access..."
if curl -s https://github.com/hamr0/addypin > /dev/null 2>&1; then
    echo "✅ GitHub repository accessible"
else
    echo "❌ GitHub repository not found - needs to be created first"
    echo "Please:"
    echo "1. Create repository at https://github.com/hamr0/addypin"
    echo "2. Push code from Replit to GitHub"
    echo "3. Then run VPS deployment script"
    exit 1
fi

echo "2. Testing VPS connectivity..."
ssh -o ConnectTimeout=5 root@155.94.144.191 "echo 'VPS connection successful'" || {
    echo "❌ Cannot connect to VPS"
    exit 1
}

echo "3. Testing deployment script..."
ssh root@155.94.144.191 "ls -la /opt/addypin/deploy.sh" || {
    echo "❌ Deployment script not found on VPS"
    exit 1
}

echo "✅ All prerequisites met - ready to test deployment"
echo ""
echo "To complete test:"
echo "1. Create GitHub repo: https://github.com/hamr0/addypin" 
echo "2. Push from Replit: git push -u origin main"
echo "3. Deploy: ssh root@155.94.144.191 '/opt/addypin/deploy.sh'"