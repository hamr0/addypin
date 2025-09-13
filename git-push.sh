#!/bin/bash

# Simple git push - let Replit handle authentication
set -e

echo "🚀 AddyPin Git Push"
echo "=================="

# Stage and commit
git add -A

if git diff --cached --quiet; then
    echo "✅ No changes to push"
    exit 0
fi

echo "📝 Changed files:"
git status --short
echo ""

# Get commit message
echo -n "💬 Commit message (or Enter for auto): "
read COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update AddyPin - $(date '+%Y-%m-%d %H:%M')"
    echo "📝 Using: $COMMIT_MSG"
fi

# Commit and push - let Replit handle auth
git commit -m "$COMMIT_MSG"
echo ""
echo "🚀 Pushing to staging..."
git push origin staging

echo "✅ Done! Check GitHub staging branch"