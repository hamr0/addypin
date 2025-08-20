# Deployment Execution - Final Clean Setup

## Commands to Execute on VPS

The user has provided the complete deployment script. Here are the exact commands to run on the VPS:

```bash
# 1. Backup existing deployment script
cp /opt/addypin/deploy.sh /opt/addypin/deploy-old.sh.bak

# 2. Create the clean deployment script with proper token variable syntax
cat > /opt/addypin/deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin
echo "Stopping AddyPin service..."
systemctl stop addypin
echo "Creating backup..."
if [ -d "app" ]; then
    cp -r app app-backup-$(date +%Y%m%d-%H%M%S)
fi
if [ ! -d "addypin-repo" ]; then
    echo "Cloning repository..."
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/amrhas82/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo && git pull origin main && cd ..
fi
echo "Building application..."
cd addypin-repo
npm install
echo "Building React client..."
npx vite build
echo "Building Node.js server..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:pg-native --minify
echo "Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/
echo "Installing production dependencies..."
cd ../app
npm install --only=production pg
chown -R addypin:addypin /opt/addypin/app
echo "Starting AddyPin service..."
systemctl start addypin
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Deployment complete!" || echo "⚠️ Check logs: journalctl -u addypin -n 20"
EOF

# 3. Make executable
chmod +x /opt/addypin/deploy.sh

# 4. Set your GitHub token and deploy
export GITHUB_PERSONAL_ACCESS_TOKEN="your_actual_github_token_here"
/opt/addypin/deploy.sh
```

## Expected Results

If successful, you should see:
- Repository cloning/updating
- React client build
- Node.js server build with bundling
- Production dependencies installation
- Service restart
- Health check confirmation
- "✅ Deployment complete!" message

## Post-Deployment Verification

```bash
# Check service status
systemctl status addypin

# Test website
curl -I https://addypin.com

# Test API
curl https://addypin.com/api/health
curl https://addypin.com/api/stats
```

This clean deployment script addresses all previous issues:
- Proper GitHub token variable syntax
- Clean build process with bundled dependencies
- No external dependency resolution issues
- Production-ready optimization and minification