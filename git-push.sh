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
# Set up Git remote with authentication if GIT_URL is available
#----------------------------------------------------------------
if [ -n "${GIT_URL:-}" ]; then
    echo -e "${CYAN}🔒 Setting up authenticated Git remote...${NC}"
    git remote set-url origin "$GIT_URL" 2>/dev/null || true
    echo -e "${GREEN}✓ Git remote configured for authentication${NC}"
else
    echo -e "${YELLOW}⚠ GIT_URL not found - using existing remote${NC}"
fi

# Show current remote for transparency
echo -e "${BLUE}📡 Git remote:${NC} $(git remote get-url origin | sed 's/:.*@/:***@/')" # Hide token
echo ""

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

# Show modified files (handle git lock gracefully)
if ! GIT_STATUS=$(git status --porcelain 2>/dev/null); then
    echo -e "${YELLOW}⚠ Git status unavailable (repository may be locked)${NC}"
    echo -e "${CYAN}Proceeding with push attempt anyway...${NC}"
    MODIFIED_FILES=0
    UNTRACKED_FILES=0 
    DELETED_FILES=0
    GIT_STATUS=""
else
    MODIFIED_FILES=$(echo "$GIT_STATUS" | grep "^ M" | wc -l)
    UNTRACKED_FILES=$(echo "$GIT_STATUS" | grep "^??" | wc -l)
    DELETED_FILES=$(echo "$GIT_STATUS" | grep "^ D" | wc -l)
fi

echo -e "${CYAN}Modified files: ${YELLOW}$MODIFIED_FILES${NC}"
echo -e "${CYAN}Untracked files: ${YELLOW}$UNTRACKED_FILES${NC}"
echo -e "${CYAN}Deleted files: ${YELLOW}$DELETED_FILES${NC}"
echo ""

# Show the actual files that changed
if [ "$MODIFIED_FILES" -gt 0 ] || [ "$UNTRACKED_FILES" -gt 0 ] || [ "$DELETED_FILES" -gt 0 ]; then
    echo -e "${BLUE}Changed files:${NC}"
    if [ -n "$GIT_STATUS" ]; then
        echo "$GIT_STATUS" | while read -r line; do
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
    else
        echo -e "  ${CYAN}(Unable to list files - git locked)${NC}"
    fi
    echo ""
else
    echo -e "${GREEN}✓ No changes detected${NC}"
    echo ""
fi

#----------------------------------------------------------------
# Check for unpushed commits (even if working directory is clean)
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🔄 Checking for Unpushed Commits${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Count commits ahead of origin/staging
UNPUSHED_COMMITS=$(git rev-list --count origin/staging..HEAD 2>/dev/null || echo "0")

if [ "$UNPUSHED_COMMITS" -gt 0 ]; then
    echo -e "${YELLOW}📤 Found $UNPUSHED_COMMITS unpushed commit(s):${NC}"
    echo ""
    git log --oneline origin/staging..HEAD | while read -r line; do
        echo -e "  ${CYAN}→${NC} $line"
    done
    echo ""
    echo -e "${GREEN}✅ Will push these commits to staging branch${NC}"
    echo ""
else
    echo -e "${GREEN}✓ All commits are up to date with remote${NC}"
    echo ""
    if [ "$MODIFIED_FILES" -eq 0 ] && [ "$UNTRACKED_FILES" -eq 0 ] && [ "$DELETED_FILES" -eq 0 ]; then
        echo -e "${YELLOW}Nothing to push. Exiting...${NC}"
        exit 0
    fi
fi

# Skip commit message section if we're just pushing existing commits
if [ "$MODIFIED_FILES" -eq 0 ] && [ "$UNTRACKED_FILES" -eq 0 ] && [ "$DELETED_FILES" -eq 0 ]; then
    echo -e "${BLUE}📦 Pushing existing commits (no new changes to commit)${NC}"
    echo ""
    COMMIT_MSG="Push existing commits to staging"
    SKIP_COMMIT=true
else
    SKIP_COMMIT=false
fi

# Only do commit flow if there are working directory changes
if [ "$SKIP_COMMIT" = "false" ]; then

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

fi  # End of SKIP_COMMIT check

#----------------------------------------------------------------
# Push to GitHub
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Pushing to GitHub${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Get current branch name for enhanced push logic
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${CYAN}Pushing current branch '${CURRENT_BRANCH}' to staging (enhanced staging-first workflow)...${NC}"

# Test Git remote connectivity first
echo -e "${CYAN}🔄 Testing remote connectivity...${NC}"
if ! git ls-remote origin >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot reach remote 'origin' - check GIT_URL authentication${NC}"
    echo -e "${YELLOW}Make sure GIT_URL secret is set with: https://username:token@github.com/...${NC}"
    exit 1
fi

# Fetch latest remote info 
echo -e "${CYAN}📡 Fetching remote information...${NC}"
git fetch origin --prune 2>/dev/null || true

# Check if staging branch exists on remote
if git ls-remote --exit-code --heads origin staging >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Remote staging branch found${NC}"
else
    echo -e "${YELLOW}📋 Remote staging branch will be created${NC}"
fi

# Enhanced Push with proper error detection
echo -e "${CYAN}🚀 Pushing ${CURRENT_BRANCH} → staging...${NC}"
PUSH_OUTPUT=$(git push -v origin "${CURRENT_BRANCH}:staging" 2>&1) || {
    echo -e "${RED}❌ Push failed:${NC}"
    echo "$PUSH_OUTPUT"
    exit 1
}

# Check push result
if echo "$PUSH_OUTPUT" | grep -q "Everything up-to-date"; then
    echo -e "${YELLOW}ℹ Everything already up-to-date on staging branch${NC}"
else
    echo -e "${GREEN}✓ Successfully pushed ${CURRENT_BRANCH} to staging branch${NC}"
fi

echo ""

#----------------------------------------------------------------
# Show deployment instructions
#----------------------------------------------------------------
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS! Changes pushed to staging branch${NC}"
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
echo -e "${BLUE}💡 Note: This script automatically synced and pushed to staging branch${NC}"
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