#!/bin/bash

# Docker Surgical Analysis Script
# Provides detailed analysis of Docker resource usage and safe cleanup recommendations

set -e

echo "🔍 DOCKER SURGICAL ANALYSIS REPORT"
echo "================================="
echo "$(date)"
echo ""

# Function to convert bytes to human readable format
bytes_to_human() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        echo "$(echo "scale=2; $bytes / 1073741824" | bc)GB"
    elif [ "$bytes" -ge 1048576 ]; then
        echo "$(echo "scale=2; $bytes / 1048576" | bc)MB"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$(echo "scale=2; $bytes / 1024" | bc)KB"
    else
        echo "${bytes}B"
    fi
}

# 1. Overall Docker disk usage
echo "📊 OVERALL DOCKER DISK USAGE"
echo "=============================="
docker system df
echo ""

# 2. Detailed space breakdown
echo "💾 DETAILED SPACE BREAKDOWN"
echo "==========================="
docker system df -v
echo ""

# 3. Running containers analysis
echo "🚀 CURRENTLY RUNNING CONTAINERS"
echo "==============================="
if [ "$(docker ps -q)" ]; then
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📸 Images used by running containers:"
    docker ps --format "{{.Image}}" | sort -u
else
    echo "No containers currently running"
fi
echo ""

# 4. All images with detailed analysis
echo "🖼️  ALL DOCKER IMAGES ANALYSIS"
echo "============================="
echo "Format: REPOSITORY:TAG | SIZE | CREATED | USED_BY_RUNNING"
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}\t{{.ID}}" | while IFS=$'\t' read -r image_tag size created id; do
    if [[ "$image_tag" != "REPOSITORY:TAG" ]]; then
        # Check if image is used by running containers
        running_usage=""
        if docker ps -q --filter ancestor="$id" | grep -q .; then
            running_usage="🔴 IN USE"
        else
            running_usage="🟢 SAFE TO REMOVE"
        fi
        echo "$image_tag | $size | $created | $running_usage"
    fi
done
echo ""

# 5. Dangling images (safe to remove)
echo "👻 DANGLING IMAGES (Safe to remove immediately)"
echo "=============================================="
dangling_count=$(docker images -f "dangling=true" -q | wc -l)
if [ "$dangling_count" -gt 0 ]; then
    docker images -f "dangling=true" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo "💡 Command to remove all dangling images:"
    echo "   docker image prune -f"
else
    echo "✅ No dangling images found"
fi
echo ""

# 6. Images older than different time periods
echo "📅 IMAGES BY AGE (Safe removal analysis)"
echo "======================================="
echo ""

# Check 1 day old
echo "🕐 Images older than 1 day:"
one_day_ago=$(date -d "1 day ago" +%s)
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}\t{{.ID}}" | \
while IFS=$'\t' read -r image_tag size created id; do
    if [[ -n "$created" ]] && [[ $(date -d "$created" +%s 2>/dev/null || echo 0) -lt $one_day_ago ]]; then
        if ! docker ps -q --filter ancestor="$id" | grep -q .; then
            echo "  🟢 $image_tag | $size | $created | SAFE TO REMOVE"
        else
            echo "  🔴 $image_tag | $size | $created | IN USE - KEEP"
        fi
    fi
done
echo ""

# Check 3 days old
echo "🕐 Images older than 3 days:"
three_days_ago=$(date -d "3 days ago" +%s)
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}\t{{.ID}}" | \
while IFS=$'\t' read -r image_tag size created id; do
    if [[ -n "$created" ]] && [[ $(date -d "$created" +%s 2>/dev/null || echo 0) -lt $three_days_ago ]]; then
        if ! docker ps -q --filter ancestor="$id" | grep -q .; then
            echo "  🟢 $image_tag | $size | $created | SAFE TO REMOVE"
        else
            echo "  🔴 $image_tag | $size | $created | IN USE - KEEP"
        fi
    fi
done
echo ""

# 7. Build cache analysis
echo "🏗️  BUILD CACHE ANALYSIS"
echo "======================="
docker builder df 2>/dev/null || echo "Build cache information not available"
echo ""

# 8. Volume analysis (excluding postgres data)
echo "💽 DOCKER VOLUMES ANALYSIS"
echo "========================="
echo "All volumes:"
docker volume ls
echo ""
echo "Unused volumes (excluding postgres_data):"
unused_volumes=$(docker volume ls -q -f dangling=true | grep -v postgres_data)
if [[ -n "$unused_volumes" ]]; then
    echo "$unused_volumes"
    echo ""
    echo "💡 Command to remove unused volumes (excluding postgres):"
    echo "   docker volume ls -q -f dangling=true | grep -v postgres_data | xargs docker volume rm"
else
    echo "✅ No unused volumes found"
fi
echo ""

# 9. SURGICAL CLEANUP RECOMMENDATIONS
echo "🔧 SURGICAL CLEANUP RECOMMENDATIONS"
echo "=================================="
echo ""

# Calculate potential space savings
echo "💰 POTENTIAL SPACE SAVINGS:"

# Dangling images
dangling_size=$(docker images -f "dangling=true" --format "{{.Size}}" | sed 's/[^0-9.]//g' | awk '{sum+=$1} END{print sum+0}')
echo "  • Dangling images: ~${dangling_size}MB"

# Old unused images (1 day+)
echo "  • Images older than 1 day (not running): Check list above"

echo ""
echo "🎯 RECOMMENDED CLEANUP COMMANDS:"
echo ""
echo "1. SAFE - Remove dangling images:"
echo "   docker image prune -f"
echo ""
echo "2. SAFE - Remove unused build cache:"
echo "   docker builder prune -f"
echo ""
echo "3. SAFE - Remove unused volumes (preserving postgres):"
echo "   docker volume ls -q -f dangling=true | grep -v postgres_data | xargs docker volume rm"
echo ""
echo "4. MANUAL - Remove specific old images (check 'SAFE TO REMOVE' above):"
echo "   docker rmi <image_id>"
echo ""
echo "5. AGGRESSIVE - Remove all images older than 1 day (not running):"
echo "   # Use with caution - manually verify each image first!"
echo ""

echo "📝 ANALYSIS COMPLETE - Review above recommendations before taking action"
echo "======================================================================="