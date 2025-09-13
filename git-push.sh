#!/bin/bash

#================================================================
# AddyPin Git Push Script for Replit (Updated Version)
# Purpose: Safely commit and push changes to GitHub
# Author: Replit Agent
# Date: February 2025
#================================================================

# Exit on any error to prevent partial operations
set -e

#----------------------------------------------------------------
# Color codes for better readability in terminal
#----------------------------------------------------------------
RED='\033[0;31m'     # Error messages
GREEN='\033[0;32m'   # Success messages
YELLOW='\033[1;33m'  # Warnings
BLUE='\033[0;34m'    # Info messages
CYAN='\033[0;36m'    # Highlights
NC='\033[0m'         # No Color (reset)

#----------------------------------------------------------------
# ASCII Art Header for visual appeal
#----------------------------------------------------------------
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║     AddyPin Git Push & Deploy Tool    ║"
echo "║          Replit → GitHub → VPS        ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

#----------------------------------------------------------------
# Check if we're in a git repository
#----------------------------------------------------------------
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    echo -e "${YELLOW}Please run this from the root of your AddyPin project${NC}"
    exit 1
fi

#----------------------------------------------------------------
# Show current branch
#----------------------------------------------------------------
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📌 Current branch: ${CYAN}$CURRENT_BRANCH${NC}"
echo ""

#----------------------------------------------------------------
# Display current git status with formatting
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Current Git Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Show modified files
MODIFIED_FILES=$(git status --porcelain | grep "^ M" | wc -l)
UNTRACKED_FILES=$(git status --porcelain | grep "^??" | wc -l)
DELETED_FILES=$(git status --porcelain | grep "^ D" | wc -l)

echo -e "${CYAN}Modified files: ${YELLOW}$MODIFIED_FILES${NC}"
echo -e "${CYAN}Untracked files: ${YELLOW}$UNTRACKED_FILES${NC}"
echo -e "${CYAN}Deleted files: ${YELLOW}$DELETED_FILES${NC}"
echo ""

# Show the actual files that changed
if [ "$MODIFIED_FILES" -gt 0 ] || [ "$UNTRACKED_FILES" -gt 0 ] || [ "$DELETED_FILES" -gt 0 ]; then
    echo -e "${BLUE}Changed files:${NC}"
    git status --short | while read -r line; do
        # Color code based on status
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
else
    echo -e "${GREEN}✓ No changes to commit - repository is clean${NC}"
    echo ""
    echo -e "${YELLOW}Nothing to push. Exiting...${NC}"
    exit 0
fi

#----------------------------------------------------------------
# Get commit message from user
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}💬 Commit Message${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${CYAN}Enter a descriptive commit message${NC}"
echo -e "${CYAN}(or press Enter for auto-generated message):${NC}"
echo -n "> "
read -r COMMIT_MSG

# Generate automatic message if user didn't provide one
if [ -z "$COMMIT_MSG" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    # Create a more descriptive auto message based on what changed
    if [ "$MODIFIED_FILES" -gt 0 ] && [ "$UNTRACKED_FILES" -gt 0 ]; then
        COMMIT_MSG="Update files and add new features - $TIMESTAMP"
    elif [ "$MODIFIED_FILES" -gt 0 ]; then
        COMMIT_MSG="Update existing files - $TIMESTAMP"
    elif [ "$UNTRACKED_FILES" -gt 0 ]; then
        COMMIT_MSG="Add new files - $TIMESTAMP"
    else
        COMMIT_MSG="Update AddyPin configuration - $TIMESTAMP"
    fi
    echo -e "${YELLOW}📝 Using auto-generated message:${NC}"
    echo -e "${CYAN}   \"$COMMIT_MSG\"${NC}"
fi

echo ""

#----------------------------------------------------------------
# Add all changes to staging
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📦 Staging Changes${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${CYAN}Adding all changes to git staging area...${NC}"
git add -A

# Show what will be committed
STAGED_COUNT=$(git diff --cached --numstat | wc -l)
echo -e "${GREEN}✓ Staged $STAGED_COUNT file(s) for commit${NC}"
echo ""

#----------------------------------------------------------------
# Commit the changes
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}💾 Committing Changes${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${CYAN}Creating commit...${NC}"
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓ Changes committed successfully${NC}"
echo ""

#----------------------------------------------------------------
# Push to GitHub
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Pushing to GitHub${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${CYAN}Pushing to origin/$CURRENT_BRANCH...${NC}"

# Push with progress indication
if git push origin "$CURRENT_BRANCH" 2>&1 | grep -q "Everything up-to-date"; then
    echo -e "${YELLOW}ℹ Everything already up-to-date on GitHub${NC}"
else
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
fi

echo ""

#----------------------------------------------------------------
# Show deployment instructions
#----------------------------------------------------------------
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS! Changes pushed to GitHub${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}📋 Next Steps for Deployment:${NC}"
echo ""
echo -e "${CYAN}1. Go to your GitHub repository:${NC}"
echo -e "   ${YELLOW}https://github.com/amrhas82/addypin${NC}"
echo ""
echo -e "${CYAN}2. Click on the 'Actions' tab${NC}"
echo ""
echo -e "${CYAN}3. Choose your deployment workflow:${NC}"
echo -e "   ${YELLOW}• AddyPin Staging Deploy${NC} - For testing"
echo -e "   ${YELLOW}• AddyPin Manual Deploy${NC} - For production"
echo ""
echo -e "${CYAN}4. Click 'Run workflow' button${NC}"
echo -e "${CYAN}5. Select 'staging' branch and click 'Run workflow'${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📍 Deployment URLs:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${CYAN}Staging:${NC} ${YELLOW}https://staging.addypin.com${NC}"
echo -e "${CYAN}Production:${NC} ${YELLOW}https://addypin.com${NC}"
echo ""

#----------------------------------------------------------------
# Show recent commits for reference
#----------------------------------------------------------------
echo -e "${BLUE}📜 Recent Commits:${NC}"
git log --oneline -5 --pretty=format:"  %C(yellow)%h%C(reset) - %s %C(cyan)(%cr)%C(reset)"
echo ""
echo ""

echo -e "${GREEN}✨ All done! Your code is ready for deployment.${NC}"