# Final Deployment Fix - Exclude External Dependencies

## The Issue
The esbuild bundling is failing on these dependencies:
- `@react-email/render` (from Resend package)  
- `@babel/preset-typescript/package.json`
- `../pkg` (from lightningcss)

## Solution
Use a more targeted approach - exclude problematic packages from bundling and install them as external dependencies.

## Updated Deployment Script

Run this on your VPS:

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
echo "Building Node.js server with external dependencies..."
npx esbuild server/index.ts \
  --platform=node \
  --bundle \
  --format=esm \
  --outdir=dist \
  --external:pg-native \
  --external:@react-email/render \
  --external:lightningcss \
  --external:@babel/preset-typescript \
  --external:resend \
  --minify
echo "Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/
echo "Installing production dependencies..."
cd ../app
npm install --only=production
chown -R addypin:addypin /opt/addypin/app
echo "Starting AddyPin service..."
systemctl start addypin
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Deployment complete!" || echo "⚠️ Check logs: journalctl -u addypin -n 20"
EOF

chmod +x /opt/addypin/deploy.sh
```

## Execute Deployment

```bash
# Set your actual GitHub token
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_actual_token"

# Run deployment
/opt/addypin/deploy.sh
```

This approach:
1. Excludes problematic packages from esbuild bundling
2. Installs them as regular dependencies in production
3. Should resolve all bundling errors
4. Maintains proper functionality with external dependencies

## If Still Failing - Alternative Approach

If the above still fails, we can use a simpler build process:

```bash
cat > /opt/addypin/deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin
systemctl stop addypin
if [ -d "app" ]; then
    cp -r app app-backup-$(date +%Y%m%d-%H%M%S)
fi
if [ ! -d "addypin-repo" ]; then
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/amrhas82/addypin.git addypin-repo
else
    cd addypin-repo && git pull origin main && cd ..
fi
cd addypin-repo
npm install
npx vite build
# Copy built files directly without server bundling
mkdir -p ../app
rm -rf ../app/*
cp -r dist/public ../app/
cp server/* ../app/
cp package*.json ../app/
cd ../app
npm install --only=production
# Transpile TypeScript to JavaScript
npx tsc server/index.ts --target es2020 --module esnext --outDir .
chown -R addypin:addypin /opt/addypin/app
systemctl start addypin
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Deployment complete!" || echo "⚠️ Check logs: journalctl -u addypin -n 20"
EOF
```