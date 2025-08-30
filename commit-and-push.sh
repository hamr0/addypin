#!/bin/bash

# AddyPin Commit and Push Script
echo "🚀 Starting git commit and push..."

# Add all changes
echo "📦 Adding all changes..."
git add .

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "Fix: CI/CD workflow rsync error + map link behavior

CRITICAL FIXES:
- Fixed rsync missing command error by adding apt-get install rsync
- Created addypin-fixed-deploy.yml with Personal Data OS proven approach
- Fixed map links opening in new tabs (removed target='_blank' from MapSection)
- Added database migration npm run db:push before container start
- Uses hardcoded SSH connection root@155.94.144.191 with deploy_key
- Proven 15-second sleep timing instead of complex health parsing
- Direct curl -f functional testing for reliability
- Manual workflow_dispatch trigger for controlled testing

DEPLOYMENT READY: All troubleshooting learnings applied from failed attempts"

# Push to main branch
echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ Complete! Changes pushed to GitHub"
echo "🎯 Now you can test the new workflow: addypin-fixed-deploy.yml"