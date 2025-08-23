#!/bin/bash

# VPS Docker Cleanup Script  
# Enhanced with deployment process integration
# Adapted from Kubernetes best practices for Docker Compose environment

set -e

echo "🧹 Starting Docker cleanup process..."

# Function to safely remove unused images
cleanup_images() {
    echo "📊 Current Docker images:"
    docker images
    
    echo "🗑️ Removing dangling images..."
    docker image prune -f
    
    echo "🔍 Removing unused images older than 7 days..."
    # Keep images from last 7 days, remove older ones
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.ID}}" | \
    awk 'NR>1' | \
    while read repo tag created id; do
        # Convert date and check if older than 7 days
        if [[ $(date -d "$created" +%s) -lt $(date -d "7 days ago" +%s) ]]; then
            echo "🗑️ Removing old image: $repo:$tag ($created)"
            docker rmi -f "$id" 2>/dev/null || echo "⚠️ Could not remove $id (might be in use)"
        fi
    done
}

# Function to clean containers
cleanup_containers() {
    echo "🗑️ Removing stopped containers..."
    docker container prune -f
}

# Function to clean networks and volumes
cleanup_networks_volumes() {
    echo "🗑️ Removing unused networks..."
    docker network prune -f
    
    echo "🗑️ Removing unused volumes (excluding postgres data)..."
    docker volume ls -q | grep -v postgres_data | xargs -r docker volume rm 2>/dev/null || true
}

# Function to cleanup build cache
cleanup_build_cache() {
    echo "🗑️ Cleaning build cache..."
    docker builder prune -f
}

# Main cleanup execution
main() {
    echo "🚀 Starting comprehensive Docker cleanup..."
    
    # Stop services temporarily for thorough cleanup
    echo "🛑 Stopping current services..."
    docker-compose down 2>/dev/null || true
    
    cleanup_containers
    cleanup_images
    cleanup_networks_volumes
    cleanup_build_cache
    
    echo "✅ Docker cleanup completed!"
    echo "📊 Final state:"
    docker system df
    
    echo "🚀 Restarting services..."
    docker-compose up -d
}

# Check if running as part of deployment
if [[ "${1}" == "--deployment" ]]; then
    echo "🔄 Running cleanup as part of deployment..."
    cleanup_containers
    cleanup_images
    cleanup_build_cache
else
    echo "🧹 Running full system cleanup..."
    main
fi

echo "✅ Docker cleanup process completed!"