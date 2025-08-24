#!/bin/bash

# Safe Docker cleanup script that preserves personal-data-os containers and images
# Usage: ./docker-cleanup-safe.sh

echo "🧹 Safe Docker Cleanup - Preserving personal-data-os"
echo "=================================================="

# List what we're going to clean before doing it
echo ""
echo "📋 CLEANUP PLAN:"

# Check for personal-data-os containers to preserve
PERSONAL_CONTAINERS=$(docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Image}}" | grep -i personal)
if [ ! -z "$PERSONAL_CONTAINERS" ]; then
    echo "✅ PRESERVING these personal-data-os containers:"
    echo "$PERSONAL_CONTAINERS"
else
    echo "ℹ️  No personal-data-os containers found to preserve"
fi

echo ""

# Show containers that will be removed (exclude personal-data-os)
CONTAINERS_TO_REMOVE=$(docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Image}}" | grep -v -i personal | tail -n +2)
if [ ! -z "$CONTAINERS_TO_REMOVE" ]; then
    echo "🗑️  Will remove these containers:"
    echo "$CONTAINERS_TO_REMOVE"
else
    echo "ℹ️  No containers to remove"
fi

echo ""

# Show images that will be removed (exclude personal-data-os)
IMAGES_TO_REMOVE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -v -i personal | tail -n +2)
if [ ! -z "$IMAGES_TO_REMOVE" ]; then
    echo "🗑️  Will remove these unused images:"
    docker images | grep -v -i personal | tail -n +2
else
    echo "ℹ️  No images to remove"
fi

echo ""
echo "⚠️  This will preserve ALL personal-data-os related containers and images"
echo ""
read -p "Continue with cleanup? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧹 Starting safe cleanup..."
    
    # Stop all containers except personal-data-os
    echo "🛑 Stopping containers (excluding personal-data-os)..."
    docker ps -q --filter "name=^(?!.*personal).*" | xargs -r docker stop
    
    # Remove stopped containers except personal-data-os
    echo "🗑️  Removing stopped containers (excluding personal-data-os)..."
    docker ps -a -q --filter "name=^(?!.*personal).*" --filter "status=exited" | xargs -r docker rm
    
    # Remove dangling images (doesn't affect named images)
    echo "🗑️  Removing dangling images..."
    docker image prune -f
    
    # Remove unused volumes (be careful here)
    echo "🗑️  Removing unused volumes..."
    docker volume prune -f
    
    # Remove unused networks
    echo "🗑️  Removing unused networks..."
    docker network prune -f
    
    echo ""
    echo "✅ Safe cleanup completed!"
    echo ""
    echo "📊 Current Docker usage:"
    docker system df
    
    echo ""
    echo "🛡️  Preserved personal-data-os resources:"
    docker ps -a | grep -i personal || echo "No personal-data-os containers currently running"
    docker images | grep -i personal || echo "No personal-data-os images found"
    
else
    echo "❌ Cleanup cancelled"
fi