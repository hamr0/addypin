#!/bin/bash

# AddyPin Deployment Script
set -e

echo "🚀 Starting AddyPin deployment..."

# Set environment variables (update these with your actual values)
export DATABASE_URL="postgresql://addypin:addypin_password@172.17.0.1:5432/addypin_db"
export RESEND_API_KEY="${RESEND_API_KEY}"
export UMAMI_APP_SECRET="${UMAMI_APP_SECRET}"
export UMAMI_HASH_SALT="${UMAMI_HASH_SALT}"

# Stop existing containers
echo "📋 Stopping existing containers..."
docker-compose down || true

# Remove old images to ensure fresh build
echo "🧹 Cleaning up old images..."
docker image prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Test backend health
echo "🏥 Testing backend health..."
curl -f http://localhost:3001/api/stats || echo "Backend not ready yet"

# Test frontend
echo "🌐 Testing frontend..."
curl -f http://localhost:3000 || echo "Frontend not ready yet"

# Test nginx proxy
echo "🔄 Testing nginx proxy..."
curl -f http://localhost/health || echo "Nginx not ready yet"

echo "✅ Deployment complete!"
echo "📊 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001" 
echo "🌍 Nginx: http://localhost"

echo "📋 To view logs:"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f nginx"