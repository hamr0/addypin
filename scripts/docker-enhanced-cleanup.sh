#!/bin/bash

# Enhanced Docker Cleanup Script
# More aggressive cleanup with configurable time periods
# Usage: ./docker-enhanced-cleanup.sh [DAYS] [--dry-run]

set -e

# Default: clean images older than 1 day (more aggressive than current 7 days)
DAYS_TO_KEEP=${1:-1}
DRY_RUN=${2}

echo "🚀 Enhanced Docker Cleanup (keeping last ${DAYS_TO_KEEP} days)"
echo "=============================================="
echo "$(date)"
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo ""
fi

# Function to execute or simulate command
run_cmd() {
    local cmd=$1
    local desc=$2
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "🔍 Would run: $desc"
        echo "   Command: $cmd"
    else
        echo "✅ Executing: $desc"
        eval "$cmd" || echo "⚠️ Command failed but continuing..."
    fi
}

# 1. Show current state
echo "📊 CURRENT DOCKER DISK USAGE"
echo "============================"
docker system df
echo ""

# 2. Clean up stopped containers first
echo "🗑️ CLEANING STOPPED CONTAINERS"
echo "=============================="
run_cmd "docker container prune -f" "Remove all stopped containers"
echo ""

# 3. Clean up dangling images (always safe)
echo "🗑️ CLEANING DANGLING IMAGES"
echo "==========================="
dangling_count=$(docker images -f "dangling=true" -q | wc -l)
if [ "$dangling_count" -gt 0 ]; then
    run_cmd "docker image prune -f" "Remove dangling images"
else
    echo "✅ No dangling images found"
fi
echo ""

# 4. Clean up images older than specified days (excluding running)
echo "🗑️ CLEANING OLD IMAGES (older than ${DAYS_TO_KEEP} days)"
echo "============================================="
cutoff_date=$(date -d "${DAYS_TO_KEEP} days ago" +%s)

# Get list of images used by running containers
running_images=$(docker ps --format "{{.Image}}" 2>/dev/null | sort -u)

# Create temporary file to store running image IDs
running_ids_file=$(mktemp)
for img in $running_images; do
    docker images --format "{{.ID}}" --filter reference="$img" >> "$running_ids_file" 2>/dev/null || true
done

removed_count=0
skipped_count=0
total_saved_mb=0

docker images --format "{{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.ID}}\t{{.Size}}" | \
while IFS=$'\t' read -r repo tag created id size; do
    # Skip if no creation date
    [[ -z "$created" ]] && continue
    
    # Check if image is older than cutoff
    if [[ $(date -d "$created" +%s 2>/dev/null || echo 0) -lt $cutoff_date ]]; then
        # Check if image is used by running containers
        if grep -q "^$id" "$running_ids_file" 2>/dev/null; then
            echo "⚠️  Skipping $repo:$tag (in use by running container)"
            skipped_count=$((skipped_count + 1))
        else
            size_mb=$(echo "$size" | sed 's/[^0-9.]//g')
            total_saved_mb=$(echo "$total_saved_mb + $size_mb" | bc 2>/dev/null || echo "$total_saved_mb")
            
            if [[ "$DRY_RUN" == "--dry-run" ]]; then
                echo "🔍 Would remove: $repo:$tag ($size, created: $created)"
            else
                echo "🗑️ Removing: $repo:$tag ($size, created: $created)"
                docker rmi -f "$id" 2>/dev/null || echo "⚠️ Could not remove $id"
            fi
            removed_count=$((removed_count + 1))
        fi
    fi
done

# Clean up temp file
rm -f "$running_ids_file"

echo ""
echo "📊 Image cleanup summary:"
echo "  • Images processed for removal: $removed_count"
echo "  • Images skipped (in use): $skipped_count"
echo "  • Estimated space saved: ~${total_saved_mb}MB"
echo ""

# 5. Clean up build cache
echo "🗑️ CLEANING BUILD CACHE"
echo "======================"
run_cmd "docker builder prune -f" "Remove build cache"
echo ""

# 6. Clean up unused volumes (preserving postgres)
echo "🗑️ CLEANING UNUSED VOLUMES"
echo "========================="
unused_volumes=$(docker volume ls -q -f dangling=true 2>/dev/null | grep -v postgres_data || true)
if [[ -n "$unused_volumes" ]]; then
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "🔍 Would remove unused volumes:"
        echo "$unused_volumes"
    else
        echo "🗑️ Removing unused volumes (preserving postgres_data):"
        echo "$unused_volumes" | xargs docker volume rm 2>/dev/null || true
    fi
else
    echo "✅ No unused volumes found"
fi
echo ""

# 7. Clean up unused networks
echo "🗑️ CLEANING UNUSED NETWORKS"
echo "==========================="
run_cmd "docker network prune -f" "Remove unused networks"
echo ""

# 8. Final state
echo "📊 FINAL DOCKER DISK USAGE"
echo "========================="
docker system df
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "🔍 DRY RUN COMPLETED - No changes were made"
    echo "💡 Run without --dry-run to execute cleanup"
else
    echo "✅ Enhanced Docker cleanup completed!"
    echo ""
    echo "💡 Pro tip: Run 'docker system df' periodically to monitor disk usage"
fi

echo ""
echo "🎯 USAGE EXAMPLES:"
echo "=================="
echo "• Current (1 day):     ./docker-enhanced-cleanup.sh"
echo "• Keep 3 days:         ./docker-enhanced-cleanup.sh 3"
echo "• Dry run (safe):      ./docker-enhanced-cleanup.sh 1 --dry-run"
echo "• Very aggressive:     ./docker-enhanced-cleanup.sh 0 --dry-run  # same day only"