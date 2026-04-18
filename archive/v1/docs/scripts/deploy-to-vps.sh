#!/bin/bash
# Deploy AddyPin to VPS with GitHub token authentication

echo "🚀 Deploying AddyPin to VPS..."

# Check if GitHub token is available
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo "❌ GITHUB_PERSONAL_ACCESS_TOKEN not found in environment"
    echo "Please ensure the token is set in Replit Secrets"
    exit 1
fi

echo "✅ GitHub token found"

# Transfer updated deployment script to VPS
echo "📤 Transferring deployment script to VPS..."
scp vps-deployment-script.sh root@155.94.144.191:/opt/addypin/deploy.sh

# Set execute permissions on VPS
echo "🔧 Setting permissions on VPS..."
ssh root@155.94.144.191 "chmod +x /opt/addypin/deploy.sh"

# Transfer the GitHub token to VPS environment
echo "🔑 Setting up GitHub authentication on VPS..."
ssh root@155.94.144.191 "echo 'export GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN' > /opt/addypin/.env"

# Run deployment on VPS
echo "🚀 Running deployment on VPS..."
ssh root@155.94.144.191 "cd /opt/addypin && source .env && ./deploy.sh"

echo "✅ Deployment completed!"
echo "🌐 Check your website: https://addypin.com"