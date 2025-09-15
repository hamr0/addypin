#!/bin/bash

# Simple AddyPin Push Script for Replit
# Works with Replit's Git authentication

echo "🚀 AddyPin Simple Push to Staging"
echo "================================="

# Add all changes
echo "📦 Adding all changes..."
git add .

# Get commit message
echo -n "💬 Commit message (or press Enter for auto): "
read -r COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update AddyPin - $(date '+%Y-%m-%d %H:%M')"
fi

# Commit changes
echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Check if GIT_URL secret exists (Replit recommended method)
if [ -n "$GIT_URL" ]; then
    echo "🔑 Using Replit Git authentication..."
    git push $GIT_URL HEAD:staging
else
    echo "🔑 Using standard Git push..."
    echo "   (You may need to enter GitHub username/token)"
    git push origin HEAD:staging
fi

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to staging!"
    echo "🌐 Check: https://staging.addypin.com"
else
    echo "❌ Push failed"
    echo "💡 To fix authentication:"
    echo "   1. Go to Replit Secrets (🔒 icon in sidebar)"
    echo "   2. Create secret: GIT_URL"
    echo "   3. Value: https://username:token@github.com/amrhas82/addypin"
    echo "   4. Get token from: https://github.com/settings/tokens"
fi