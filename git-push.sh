#!/bin/bash

#================================================================
# AddyPin Git Push Script for Replit
# Purpose: Safely commit and push changes to staging environment
# Author: Replit Agent  
# Date: September 2025
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
echo "║    AddyPin Location Sharing Deploy    ║"
echo "║     Replit → GitHub → VPS Staging     ║"
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
            " M") echo -e "  ${YELLOW}[modified]${NC} $FILE" ;;
            "??") echo -e "  ${GREEN}[new file]${NC} $FILE" ;;
            " D") echo -e "  ${RED}[deleted]${NC} $FILE" ;;
            *) echo -e "  ${CYAN}[$STATUS]${NC} $FILE" ;;
        esac
    done
    echo ""
else
    echo -e "${GREEN}✓ No changes to commit - repository is clean${NC}"
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
    
    # If no changes and nothing to push, exit
    if [ "$MODIFIED_FILES" -eq 0 ] && [ "$UNTRACKED_FILES" -eq 0 ] && [ "$DELETED_FILES" -eq 0 ]; then
        echo -e "${YELLOW}Nothing to commit or push. Exiting...${NC}"
        exit 0
    fi
fi

# Skip commit message section if we're just pushing existing commits
if [ "$MODIFIED_FILES" -eq 0 ] && [ "$UNTRACKED_FILES" -eq 0 ] && [ "$DELETED_FILES" -eq 0 ]; then
    echo -e "${BLUE}📦 Pushing existing commits (no new changes to commit)${NC}"
    echo ""
    # Jump directly to push section
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
        COMMIT_MSG="Update location sharing features and infrastructure - $TIMESTAMP"
    elif [ "$MODIFIED_FILES" -gt 0 ]; then
        COMMIT_MSG="Update AddyPin components - $TIMESTAMP"
    elif [ "$UNTRACKED_FILES" -gt 0 ]; then
        COMMIT_MSG="Add new location sharing features - $TIMESTAMP"
    else
        COMMIT_MSG="Update AddyPin Location Sharing - $TIMESTAMP"
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
# Push to GitHub (always execute for both new commits and unpushed commits)
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Pushing to GitHub${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Get current branch name for enhanced push logic
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${CYAN}Pushing current branch '${CURRENT_BRANCH}' to origin/staging (enhanced staging-first workflow)...${NC}"

# Sync with remote staging before pushing (prevent conflicts)
echo -e "${CYAN}🔄 Syncing with remote staging branch...${NC}"
if git ls-remote --exit-code --heads origin staging >/dev/null 2>&1; then
    git fetch origin staging 2>/dev/null || true
    echo -e "${GREEN}✓ Remote staging information updated${NC}"
else
    echo -e "${YELLOW}📋 Remote staging branch doesn't exist yet (will be created)${NC}"
fi

# Enhanced Push: Push current branch to staging branch (work from any branch!)
echo -e "${CYAN}🚀 Pushing ${CURRENT_BRANCH} → staging...${NC}"
if git push origin $CURRENT_BRANCH:staging; then
    echo -e "${GREEN}✓ Successfully pushed ${CURRENT_BRANCH} to staging branch${NC}"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    echo -e "${YELLOW}⚠️  This might be due to authentication issues${NC}"
    echo -e "${CYAN}💡 Try setting up GitHub token or SSH keys${NC}"
    exit 1
fi

echo ""

#----------------------------------------------------------------
# Show VPS deployment instructions
#----------------------------------------------------------------
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 SUCCESS! Changes pushed to staging branch${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}📋 VPS Staging Deployment Workflow:${NC}"
echo ""
echo -e "${CYAN}1. Go to your GitHub repository:${NC}"
echo -e "   ${YELLOW}https://github.com/amrhas82/addypin${NC}"
echo ""
echo -e "${CYAN}2. Choose deployment method:${NC}"
echo ""
echo -e "${YELLOW}   Option A: GitHub Actions (if configured)${NC}"
echo -e "   ${YELLOW}• Click on the 'Actions' tab${NC}"
echo -e "   ${YELLOW}• Select 'AddyPin Staging Deploy' workflow${NC}"
echo -e "   ${YELLOW}• Click 'Run workflow' → Select 'staging' branch → Run${NC}"
echo ""
echo -e "${YELLOW}   Option B: Manual VPS Deployment${NC}"
echo -e "   ${YELLOW}• SSH into VPS: ssh root@155.94.144.191${NC}"
echo -e "   ${YELLOW}• Navigate to staging directory: cd /opt/addypin-staging${NC}"
echo -e "   ${YELLOW}• Pull latest changes: git pull origin staging${NC}"
echo -e "   ${YELLOW}• Update database: npm run db:push (staging)${NC}"
echo -e "   ${YELLOW}• Restart containers: docker-compose up -d${NC}"
echo ""
echo -e "${CYAN}3. Update staging database connection:${NC}"
echo -e "   ${YELLOW}DATABASE_URL=\"postgresql://addypin_user:[SECURE_PASSWORD]@172.17.0.1:5432/addypin_staging\"${NC}"
echo ""
echo -e "${CYAN}4. Test thoroughly on staging environment${NC}"
echo ""
echo -e "${CYAN}5. When ready for production:${NC}"
echo -e "   ${YELLOW}• Merge staging → main branch${NC}"
echo -e "   ${YELLOW}• Deploy to production VPS using main branch${NC}"
echo -e "   ${YELLOW}• Update production database (addypin)${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🌐 Environment Details:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${CYAN}VPS Server:${NC} ${YELLOW}155.94.144.191 (AddyPin Infrastructure)${NC}"
echo -e "${CYAN}Staging Database:${NC} ${YELLOW}addypin_staging (5 tables)${NC}"
echo -e "${CYAN}Production Database:${NC} ${YELLOW}addypin (5 tables)${NC}"
echo -e "${CYAN}Development Database:${NC} ${YELLOW}addypin_dev (active in Replit)${NC}"
echo ""
echo -e "${CYAN}Container Status Check:${NC}"
echo -e "   ${YELLOW}ssh root@155.94.144.191 'docker ps'${NC}"
echo ""
echo -e "${CYAN}Database Status Check:${NC}"
echo -e "   ${YELLOW}ssh root@155.94.144.191 'docker exec addypin-postgres psql -U addypin_user -d addypin_staging -c \"\\dt\"'${NC}"
echo ""

#----------------------------------------------------------------
# Show recent commits for reference
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📚 Recent Commits (last 3):${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
git log --oneline -3 | while read -r line; do
    echo -e "  ${CYAN}→${NC} $line"
done
echo ""

#----------------------------------------------------------------
# Final deployment links
#----------------------------------------------------------------
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🔗 Deployment URLs:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${CYAN}Staging:${NC} ${YELLOW}https://staging.addypin.com${NC}"
echo -e "${CYAN}Production:${NC} ${YELLOW}https://addypin.com${NC}"
echo ""
echo -e "${GREEN}✨ All done! Your changes are safely committed and pushed.${NC}"
echo ""