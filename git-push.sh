#!/bin/bash

# Simple git push script - foundation

# Colors for visuals
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║        AddyPin Git Push Tool          ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Sync first
echo -e "${BLUE}🔄 Syncing with remote...${NC}"
git pull origin staging

# Show what changed
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Files Changed${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

MODIFIED=$(git status --porcelain | grep "^ M" | wc -l)
NEW=$(git status --porcelain | grep "^??" | wc -l) 
DELETED=$(git status --porcelain | grep "^ D" | wc -l)

echo -e "${YELLOW}Modified: $MODIFIED${NC} | ${GREEN}New: $NEW${NC} | ${RED}Deleted: $DELETED${NC}"

if [ $MODIFIED -gt 0 ] || [ $NEW -gt 0 ] || [ $DELETED -gt 0 ]; then
    echo ""
    git status --short
fi

# Add all changes
git add .

# Generate auto commit message based on changes
generate_auto_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M')
    local total_changes=$((MODIFIED + NEW + DELETED))
    
    # Check file types for better categorization
    local has_js=$(git status --porcelain | grep -E '\.(js|ts|jsx|tsx)$' | wc -l)
    local has_css=$(git status --porcelain | grep -E '\.(css|scss|sass)$' | wc -l)
    local has_docs=$(git status --porcelain | grep -E '\.(md|txt|rst)$' | wc -l)
    local has_config=$(git status --porcelain | grep -E '\.(json|yaml|yml|toml|ini)$' | wc -l)
    
    if [ $has_docs -gt 0 ] && [ $total_changes -eq $has_docs ]; then
        echo "docs: update documentation"
    elif [ $has_config -gt 0 ] && [ $total_changes -eq $has_config ]; then
        echo "config: update configuration files"
    elif [ $has_css -gt 0 ] && [ $has_js -eq 0 ]; then
        echo "style: update styling and UI components"
    elif [ $NEW -gt $MODIFIED ] && [ $NEW -gt $DELETED ]; then
        echo "feat: add new features and components"
    elif [ $MODIFIED -gt 0 ] && [ $NEW -eq 0 ] && [ $DELETED -eq 0 ]; then
        echo "fix: update existing functionality"
    else
        echo "chore: general updates and maintenance - $timestamp"
    fi
}

# Get commit message
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}💬 Commit Message${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

AUTO_MESSAGE=$(generate_auto_message)
echo -e "${CYAN}Auto-generated: ${YELLOW}$AUTO_MESSAGE${NC}"
echo ""
echo -n "💬 Enter message (or press Enter for auto): "
read MESSAGE

if [ -z "$MESSAGE" ]; then
    MESSAGE="$AUTO_MESSAGE"
    echo -e "${GREEN}✓ Using auto-generated message${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}💾 Committing Changes${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Commit with the message
git commit -m "$MESSAGE"
echo -e "${GREEN}✓ Committed: $MESSAGE${NC}"

# Push to staging branch
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Pushing to GitHub${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

git push origin staging

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 Deployment URLs:${NC}"
echo -e "${CYAN}Staging:${NC} ${YELLOW}https://staging.addypin.com${NC}"
echo -e "${CYAN}Production:${NC} ${YELLOW}https://addypin.com${NC}"
echo ""
echo -e "${GREEN}✨ All done!${NC}"