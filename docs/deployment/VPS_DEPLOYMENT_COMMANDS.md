# Direct VPS Deployment Commands

Since Replit doesn't have SSH available, run these commands directly on your VPS terminal.

## Step 1: Copy the complete deployment script to your VPS

**On your VPS terminal (PuTTY), paste this entire block:**

```bash
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
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/hamr0/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo && git pull origin main && cd ..
fi

echo "Building application..."
cd addypin-repo
npm install
npm run build

echo "Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/

chown -R addypin:addypin /opt/addypin/app
cd ../app && npm install --only=production

echo "Starting AddyPin service..."
systemctl start addypin

sleep 3
if curl -f https://addypin.com/api/health > /dev/null 2>&1; then
    echo "✅ AddyPin deployment completed successfully!"
    echo "🌐 Live at: https://addypin.com"
else
    echo "⚠️ Health check failed - check logs with: journalctl -u addypin -f"
fi
EOF

chmod +x /opt/addypin/deploy.sh
echo "Deployment script created successfully!"
```

## Step 2: Set the GitHub token and run deployment

```bash
# Set your GitHub token (replace with your actual token)
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_MdGpnSYourActualTokenHere"

# Run the deployment
/opt/addypin/deploy.sh
```

## Your GitHub Token
Your token starts with: `ghp_MdGpnS...`

Use your complete GitHub Personal Access Token in the export command above.

## Expected Output
```
🚀 Starting AddyPin deployment from GitHub...
Stopping AddyPin service...
Creating backup...
Cloning repository...
Building application...
Deploying files...
Starting AddyPin service...
✅ AddyPin deployment completed successfully!
🌐 Live at: https://addypin.com
```