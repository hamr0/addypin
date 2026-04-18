#!/bin/bash

# AddyPin Rollback Script
set -e

echo "🔄 Starting AddyPin rollback..."

# Stop current containers
echo "🛑 Stopping current containers..."
docker-compose down

# Remove current images
echo "🧹 Removing current images..."
docker rmi addypin-frontend:latest addypin-backend:latest 2>/dev/null || true

# Restore from backup (if available)
if [ -f "docker-compose.backup.yml" ]; then
    echo "📦 Restoring from backup..."
    cp docker-compose.backup.yml docker-compose.yml
else
    echo "⚠️ No backup found, manual intervention required"
fi

echo "✅ Rollback complete!"
echo "💡 To start services: docker-compose up -d"