#!/bin/bash

# AddyPin Commit and Push Script
echo "🚀 Starting git commit and push..."

# Add all changes
echo "📦 Adding all changes..."
git add .

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "Fix: Add proven CI/CD workflow and map link behavior

- Created addypin-fixed-deploy.yml with Personal Data OS approach
- Fixed map links to open in same window (removed target='_blank')
- Added database migration step before container deployment
- Uses proven 15-second timing and direct curl testing
- Manual trigger workflow for controlled deployment testing"

# Push to main branch
echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ Complete! Changes pushed to GitHub"
echo "🎯 Now you can test the new workflow: addypin-fixed-deploy.yml"