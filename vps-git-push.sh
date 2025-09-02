#!/bin/bash

#================================================================
# AddyPin VPS Git Push Script
# Purpose: Push changes from VPS deployment back to GitHub
# Location: Run this on VPS at /opt/addypin
# Author: Replit Agent
# Date: February 2025
#================================================================

# Exit on any error
set -e

#----------------------------------------------------------------
# Color codes for terminal output
#----------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#----------------------------------------------------------------
# Header
#----------------------------------------------------------------
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}    VPS → GitHub Push Tool${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

#----------------------------------------------------------------
# IMPORTANT: Change to correct directory first
# User might be in a backup subdirectory
#----------------------------------------------------------------
echo -e "${BLUE}📍 Checking current directory...${NC}"
CURRENT_DIR=$(pwd)
echo -e "   Current: $CURRENT_DIR"

# If we're in a subdirectory (like backup), go to main addypin dir
if [[ "$CURRENT_DIR" == *"/opt/addypin/"* ]] && [[ "$CURRENT_DIR" != "/opt/addypin" ]]; then
    echo -e "${YELLOW}⚠ You're in a subdirectory, changing to /opt/addypin${NC}"
    cd /opt/addypin
elif [[ "$CURRENT_DIR" != "/opt/addypin" ]]; then
    echo -e "${YELLOW}⚠ Not in /opt/addypin, changing directory...${NC}"
    cd /opt/addypin
fi

echo -e "${GREEN}✓ Now in: $(pwd)${NC}"
echo ""

#----------------------------------------------------------------
# Check if git repository exists
#----------------------------------------------------------------
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: No git repository found in /opt/addypin${NC}"
    echo -e "${YELLOW}This means the code wasn't deployed via git clone${NC}"
    echo -e "${YELLOW}You should use GitHub Actions for deployment instead${NC}"
    exit 1
fi

#----------------------------------------------------------------
# Configure git user if not set (required for commits)
#----------------------------------------------------------------
GIT_USER=$(git config user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "")

if [ -z "$GIT_USER" ] || [ -z "$GIT_EMAIL" ]; then
    echo -e "${YELLOW}⚙ Setting up git configuration...${NC}"
    git config user.name "AddyPin VPS"
    git config user.email "vps@addypin.com"
    echo -e "${GREEN}✓ Git config set${NC}"
fi

#----------------------------------------------------------------
# Show current branch
#----------------------------------------------------------------
BRANCH=$(git branch --show-current)
echo -e "${BLUE}📌 Current branch: ${CYAN}$BRANCH${NC}"
echo ""

#----------------------------------------------------------------
# Check for changes
#----------------------------------------------------------------
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Checking for changes...${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Count different types of changes
MODIFIED=$(git status --porcelain | grep "^ M" | wc -l)
UNTRACKED=$(git status --porcelain | grep "^??" | wc -l)
DELETED=$(git status --porcelain | grep "^ D" | wc -l)

if [ "$MODIFIED" -eq 0 ] && [ "$UNTRACKED" -eq 0 ] && [ "$DELETED" -eq 0 ]; then
    echo -e "${GREEN}✓ No changes to commit${NC}"
    echo -e "${YELLOW}Repository is clean, nothing to push${NC}"
    exit 0
fi

# Show what changed
echo -e "${CYAN}Modified files: ${YELLOW}$MODIFIED${NC}"
echo -e "${CYAN}New files: ${YELLOW}$UNTRACKED${NC}"
echo -e "${CYAN}Deleted files: ${YELLOW}$DELETED${NC}"
echo ""

# List the actual files
echo -e "${BLUE}Changed files:${NC}"
git status --short
echo ""

#----------------------------------------------------------------
# Stage all changes
#----------------------------------------------------------------
echo -e "${BLUE}📦 Staging changes...${NC}"
git add -A
echo -e "${GREEN}✓ All changes staged${NC}"
echo ""

#----------------------------------------------------------------
# Create commit
#----------------------------------------------------------------
echo -e "${BLUE}💾 Creating commit...${NC}"

# Generate automatic commit message with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
HOSTNAME=$(hostname)
COMMIT_MSG="VPS update from $HOSTNAME - $TIMESTAMP"

# Commit the changes
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓ Committed: \"$COMMIT_MSG\"${NC}"
echo ""

#----------------------------------------------------------------
# Push to GitHub
#----------------------------------------------------------------
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
echo -e "${CYAN}Pushing to origin/$BRANCH...${NC}"

# Try to push
if git push origin "$BRANCH" 2>&1; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    echo -e "${YELLOW}This might happen if:${NC}"
    echo -e "${YELLOW}  1. VPS doesn't have push permissions${NC}"
    echo -e "${YELLOW}  2. There are conflicts with remote${NC}"
    echo -e "${YELLOW}  3. Authentication is not configured${NC}"
    echo ""
    echo -e "${CYAN}Recommended: Use GitHub Actions for deployments instead${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Changes pushed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"