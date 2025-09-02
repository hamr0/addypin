#!/bin/bash

# Replit Git Push Script for AddyPin
# Run this in Replit to commit and push changes

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AddyPin Git Push Script${NC}"
echo "=================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️ Not in a git repository${NC}"
    exit 1
fi

# Show current status
echo -e "${BLUE}📋 Current Git Status:${NC}"
git status --short

echo ""
echo -e "${BLUE}📝 Changed Files:${NC}"
git diff --name-only

echo ""
read -p "🤔 Enter commit message (or press Enter for auto-message): " COMMIT_MSG

# Generate auto message if empty
if [ -z "$COMMIT_MSG" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    COMMIT_MSG="Update AddyPin configuration and fixes - $TIMESTAMP"
    echo -e "${YELLOW}📝 Using auto-generated message: $COMMIT_MSG${NC}"
fi

echo ""
echo -e "${BLUE}📦 Adding all changes...${NC}"
git add -A

echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin main

echo ""
echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
echo -e "${GREEN}🎉 Changes are now available for CI/CD deployment${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Go to GitHub Actions in your repository"
echo "2. Run 'AddyPin Staging Deploy' workflow for staging"
echo "3. Run 'AddyPin Manual Deploy' workflow for production"