#!/bin/bash

# Umami Analytics Deployment Script
# Self-hosted privacy-focused analytics for addypin

set -e

echo "🚀 Setting up Umami Analytics for addypin..."

# Check if environment variables are set
if [[ -z "$UMAMI_APP_SECRET" || -z "$UMAMI_HASH_SALT" ]]; then
    echo "❌ Missing environment variables. Please set:"
    echo "   UMAMI_APP_SECRET (run: openssl rand -base64 32)"
    echo "   UMAMI_HASH_SALT (run: openssl rand -base64 32)"
    echo ""
    echo "Add these to your .env file:"
    echo "UMAMI_APP_SECRET=$(openssl rand -base64 32)"
    echo "UMAMI_HASH_SALT=$(openssl rand -base64 32)"
    exit 1
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL not found. Make sure your PostgreSQL is configured."
    exit 1
fi

# Deploy Umami using Docker Compose
echo "📦 Deploying Umami container..."
docker-compose -f umami-docker-compose.yml up -d

# Wait for Umami to be ready
echo "⏳ Waiting for Umami to start..."
sleep 10

# Check if Umami is running
if curl -f http://localhost:3001/api/heartbeat >/dev/null 2>&1; then
    echo "✅ Umami is running successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Open http://localhost:3001"
    echo "2. Login with admin/umami"
    echo "3. Change the default password immediately"
    echo "4. Add your website (addypin.com)"
    echo "5. Copy the website ID to your environment variables:"
    echo "   UMAMI_WEBSITE_ID=your-website-id"
    echo "   VITE_UMAMI_URL=http://localhost:3001"
    echo "   VITE_UMAMI_WEBSITE_ID=your-website-id"
    echo ""
    echo "📊 Your privacy-focused analytics are ready!"
else
    echo "❌ Umami failed to start. Check docker logs:"
    echo "docker-compose -f umami-docker-compose.yml logs"
fi