#!/bin/bash

# Simple git add, commit, push script for Replit
# Just like doing: git add . && git commit -m "message" && git push

echo "🚀 AddyPin Git Push"
echo "=================="

# Add all changes
echo "📦 Adding files..."
git add .

# Get commit message
echo -n "💬 Commit message: "
read COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update $(date '+%m/%d %H:%M')"
fi

# Commit
echo "💾 Committing..."
git commit -m "$COMMIT_MSG"

# Push - use GIT_URL secret if available, otherwise regular push
echo "🚀 Pushing to staging..."
if [ -n "${GIT_URL:-}" ]; then
    git push $GIT_URL staging
else
    git push origin staging
fi

echo "✅ Done!"