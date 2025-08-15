#!/bin/bash

# Manual Umami Setup for Replit Environment
# Since Docker is not available, we'll use Node.js directly

set -e

echo "🚀 Setting up Umami Analytics manually..."

# Check if secrets are available
if [[ -z "$UMAMI_APP_SECRET" || -z "$UMAMI_HASH_SALT" ]]; then
    echo "❌ Missing Umami secrets. Please ensure UMAMI_APP_SECRET and UMAMI_HASH_SALT are set."
    exit 1
fi

# Create umami directory
mkdir -p umami-analytics
cd umami-analytics

# Download and setup Umami
if [ ! -d "umami" ]; then
    echo "📦 Cloning Umami repository..."
    git clone https://github.com/umami-software/umami.git
    cd umami
    
    # Install dependencies
    echo "📦 Installing Umami dependencies..."
    npm install
    
    # Build the application
    echo "🔨 Building Umami..."
    npm run build
else
    cd umami
    echo "✅ Umami already exists, updating..."
    git pull
fi

# Create environment file for Umami
cat > .env.local << EOF
DATABASE_URL=${DATABASE_URL}
DATABASE_TYPE=postgresql
APP_SECRET=${UMAMI_APP_SECRET}
HASH_SALT=${UMAMI_HASH_SALT}
TRACKER_SCRIPT_NAME=umami.js
PORT=3001
EOF

echo "✅ Umami configuration created"
echo ""
echo "🚀 To start Umami, run:"
echo "cd umami-analytics/umami && npm start"
echo ""
echo "📊 Then access dashboard at: http://localhost:3001"
echo "🔑 Default login: admin / umami (change immediately!)"