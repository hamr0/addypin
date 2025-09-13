#!/bin/bash

# Simple AddyPin Git Push - back to basics!
set -e

echo "🚀 AddyPin Git Push"
echo "=================="

# Stage all changes
git add -A

# Show what's changed 
if git status --short | grep -q .; then
    echo ""
    echo "📝 Changed files:"
    git status --short
    echo ""
else
    echo ""
    echo "✅ No changes to commit"
    exit 0
fi

# Get commit message
echo -n "💬 Commit message (or Enter for auto): "
read COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update AddyPin - $(date '+%Y-%m-%d %H:%M')"
    echo "📝 Using: $COMMIT_MSG"
fi

# Commit
git commit -m "$COMMIT_MSG"

# Show confirmation prompt (the "toast" you liked!)
CHANGE_COUNT=$(git status --short | wc -l)
echo ""
echo -n "🚀 Push $CHANGE_COUNT changes to staging? [y/N] "
read -r CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Push cancelled"
    exit 0
fi

# Check for GIT_URL secret
if [ -z "${GIT_URL:-}" ]; then
    echo "❌ Set Replit Secret GIT_URL to: https://username:TOKEN@github.com/amrhas82/addypin"
    exit 1
fi

# Push using the secret (this is what was working!)
echo "🚀 Pushing to staging..."
git push "$GIT_URL" HEAD:staging

echo ""
echo "✅ Done! Pushed to https://staging.addypin.com"