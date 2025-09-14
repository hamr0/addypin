#!/bin/bash

# Simple git push script - foundation

echo "Git Push to Staging"
echo "=================="

# Sync first
echo "Syncing with remote..."
git pull origin staging

# Show what changed
echo ""
echo "Files changed:"
MODIFIED=$(git status --porcelain | grep "^ M" | wc -l)
NEW=$(git status --porcelain | grep "^??" | wc -l) 
DELETED=$(git status --porcelain | grep "^ D" | wc -l)

echo "Modified: $MODIFIED, New: $NEW, Deleted: $DELETED"

if [ $MODIFIED -gt 0 ] || [ $NEW -gt 0 ] || [ $DELETED -gt 0 ]; then
    git status --short
fi

# Add all changes
git add .

# Get commit message
echo ""
echo -n "Commit message: "
read MESSAGE

# Commit with the message
git commit -m "$MESSAGE"

# Push to staging branch
git push origin staging

echo ""
echo "Done!"
echo ""
echo "URLs:"
echo "Staging: https://staging.addypin.com"
echo "Production: https://addypin.com"