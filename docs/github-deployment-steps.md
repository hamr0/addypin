# GitHub Deployment Steps

## Step 1: Access Your Repository
1. Go to: https://github.com/hamr0/addypin
2. You should see the main branch with recent commits

## Step 2: Commit Changes via GitHub Web Interface

**Option A: Use Git Panel in Replit**
1. In Replit, look for the "Git" tab in the left sidebar
2. Click "Stage all changes"
3. Enter commit message: "Deploy database connectivity fix via CI/CD"
4. Click "Commit & Push"

**Option B: Use GitHub Web Interface**
1. On GitHub repository page, click "Add file" → "Upload files"
2. Drag the modified files or click "choose your files"
3. Add commit message: "Deploy database connectivity fix via CI/CD"
4. Click "Commit changes"

## Step 3: Monitor Deployment
1. Go to: https://github.com/hamr0/addypin/actions
2. Watch the deployment workflow run
3. Check each step: Build → Deploy → Health Check

## Step 4: Verify Success
1. Test: https://addypin.com/api/stats
2. Should return actual data instead of "Failed to fetch stats"

The automated rollback will activate if any step fails.