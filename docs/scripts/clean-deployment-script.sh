#!/bin/bash
# Clean AddyPin VPS Deployment Script
set -e

echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin

# Stop service
echo "Stopping AddyPin service..."
systemctl stop addypin

# Backup current deployment
echo "Creating backup..."
if [ -d "app" ]; then
    cp -r app app-backup-$(date +%Y%m%d-%H%M%S)
fi

# Clone or pull latest code
if [ ! -d "addypin-repo" ]; then
    echo "Cloning repository..."
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/amrhas82/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo && git pull origin main && cd ..
fi

# Build application
echo "Building application..."
cd addypin-repo
npm install

# Build client (React app)
echo "Building React client..."
npx vite build

# Build server with bundled dependencies (clean approach)
echo "Building Node.js server..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:pg-native --minify

# Deploy built files
echo "Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/

# Install minimal production dependencies (only for external modules like pg-native)
echo "Installing production dependencies..."
cd ../app
npm install --only=production pg

# Set correct permissions
chown -R addypin:addypin /opt/addypin/app

# Start service
echo "Starting AddyPin service..."
systemctl start addypin

# Verify deployment
echo "Verifying deployment..."
sleep 3
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ AddyPin deployment completed successfully!"
    echo "🌐 Live at: https://addypin.com"
else
    echo "⚠️ Health check failed - check logs with: journalctl -u addypin -n 20"
fi