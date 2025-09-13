#!/bin/bash

#================================================================
# AddyPin Simple Git Push Script for Replit
# Purpose: Safely commit and push changes to staging branch
#================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║     AddyPin Git Push & Deploy Tool    ║"
echo "║          Replit → GitHub → VPS        ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📌 Current branch: ${CYAN}$CURRENT_BRANCH${NC}"
echo ""

#----------------------------------------------------------------
# Show current git status
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Current Git Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Show what's changed
if git status --short | grep -q .; then
    echo -e "${BLUE}Changed files:${NC}"
    git status --short | while read -r line; do
        STATUS="${line:0:2}"
        FILE="${line:3}"
        case "$STATUS" in
            " M") echo -e "  ${YELLOW}[M ]${NC} $FILE" ;;
            "??") echo -e "  ${GREEN}[??]${NC} $FILE" ;;
            " D") echo -e "  ${RED}[ D]${NC} $FILE" ;;
            *) echo -e "  ${CYAN}[$STATUS]${NC} $FILE" ;;
        esac
    done
    echo ""
    HAS_CHANGES=true
else
    echo -e "${GREEN}✓ No changes to commit${NC}"
    echo ""
    HAS_CHANGES=false
fi

#----------------------------------------------------------------
# Get commit message if there are changes
#----------------------------------------------------------------
if [ "$HAS_CHANGES" = true ]; then
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}💬 Commit Message${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}Enter a descriptive commit message:${NC}"
    echo -n "> "
    read -r COMMIT_MSG

    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update AddyPin - $(date '+%Y-%m-%d %H:%M')"
        echo -e "${YELLOW}📝 Using auto-generated message: $COMMIT_MSG${NC}"
    fi

    echo ""

    #----------------------------------------------------------------
    # Commit changes
    #----------------------------------------------------------------
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}📦 Committing Changes${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"

    echo -e "${CYAN}Adding all changes...${NC}"
    git add -A

    echo -e "${CYAN}Creating commit...${NC}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ Changes committed successfully${NC}"
    echo ""
fi

#----------------------------------------------------------------
# Push to staging
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Pushing to GitHub Staging${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${CYAN}Pushing to staging branch...${NC}"
git push origin staging

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS! Pushed to GitHub staging${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}📍 Deployment URLs:${NC}"
echo -e "${CYAN}Staging:${NC} ${YELLOW}https://staging.addypin.com${NC}"
echo -e "${CYAN}Production:${NC} ${YELLOW}https://addypin.com${NC}"
echo ""

echo -e "${BLUE}📜 Recent Commits:${NC}"
git log --oneline -5 --pretty=format:"  %C(yellow)%h%C(reset) - %s %C(cyan)(%cr)%C(reset)"
echo ""
echo ""

echo -e "${GREEN}✨ All done! Your code is ready for deployment.${NC}"