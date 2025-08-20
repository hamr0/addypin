# Manual Deployment Instructions

## Issue
Replit environment doesn't have SSH/SCP commands available for automated deployment.

## Manual Deployment Steps

### Step 1: Update VPS Deployment Script
Copy the updated deployment script to your VPS manually:

**On your VPS terminal (PuTTY), run:**
```bash
# Create the updated deployment script with token authentication
cat > /opt/addypin/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin

# Stop service
echo "Stopping AddyPin service..."
systemctl stop addypin

# Backup current deployment
echo "Creating backup..."
cp -r app app-backup-$(date +%Y%m%d-%H%M%S)

# Clone or pull latest code using token
if [ ! -d "addypin-repo" ]; then
    echo "Cloning repository..."
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/amrhas82/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo
    git pull origin main
    cd ..
fi

# Build production version
echo "Building application..."
cd addypin-repo
npm install
npm run build

# Deploy built files
echo "Deploying files..."
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/

# Set correct permissions
chown -R addypin:addypin /opt/addypin/app

# Install production dependencies
echo "Installing production dependencies..."
cd ../app
npm install --only=production

# Start service
echo "Starting AddyPin service..."
systemctl start addypin

# Verify deployment
echo "Verifying deployment..."
sleep 3
if curl -f https://addypin.com/api/health; then
    echo ""
    echo "✅ AddyPin deployment completed successfully!"
    echo "🌐 Live at: https://addypin.com"
else
    echo "⚠️ Health check failed - check logs with: journalctl -u addypin -f"
fi
EOF

# Make executable
chmod +x /opt/addypin/deploy.sh
```

### Step 2: Set GitHub Token on VPS
```bash
# Set the GitHub token (replace YOUR_TOKEN with actual token)
export GITHUB_PERSONAL_ACCESS_TOKEN="your_github_token_here"

# Make it persistent
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="your_github_token_here"' >> ~/.bashrc
```

### Step 3: Run Deployment
```bash
/opt/addypin/deploy.sh
```

## Your GitHub Token
Use your actual GitHub Personal Access Token (starts with `ghp_`) in the commands above.