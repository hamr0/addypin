# Complete VPS Deployment Commands

## Actions for YOU to take on your VPS

### 1. SSH to VPS
```bash
ssh root@155.94.144.191
```

### 2. Create Final Deployment Script
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
echo "Building React client..."
npx vite build
echo "Preparing deployment..."
rm -rf ../app
cp -r . ../app
cd ../app
echo "Installing production dependencies..."
npm ci --only=production
chown -R addypin:addypin /opt/addypin/app
echo "Starting AddyPin service..."
systemctl start addypin
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Deployment complete!" || echo "⚠️ Check logs: journalctl -u addypin -n 20"
EOF

chmod +x /opt/addypin/deploy.sh
```

### 3. Update Systemd Service with Database Password
```bash
cat > /etc/systemd/system/addypin.service << 'EOF'
[Unit]
Description=AddyPin Location Sharing Service
After=network.target

[Service]
Type=simple
User=addypin
WorkingDirectory=/opt/addypin/app
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=always
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://addypin_user:secure_password_123@localhost:5432/addypin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
```

### 4. Deploy AddyPin
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="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"
/opt/addypin/deploy.sh
```

## What This Solution Does

- **No bundling conflicts** - Copies entire working codebase
- **Same runtime as development** - tsx runs TypeScript directly
- **All dependencies included** - npm ci installs everything
- **Proper database connection** - Uses your PostgreSQL password
- **Production environment** - NODE_ENV=production set

This mirrors your successful Replit development environment exactly, avoiding all the module system conflicts we encountered with bundling approaches.