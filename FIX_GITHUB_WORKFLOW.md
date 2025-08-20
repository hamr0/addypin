# Fix GitHub Actions Workflow

## Problem: GitHub Actions using old SSH version
The repository has old deploy.yml with SSH v1.0.0 (failing) instead of v1.0.3 (working)

## Steps to Fix:

1. Go to: https://github.com/amrhas82/addypin/.github/workflows/deploy.yml
2. Click pencil icon (Edit)
3. Find line 60: `uses: appleboy/ssh-action@v1.0.0`
4. Change to: `uses: appleboy/ssh-action@v1.0.3`
5. Add these lines after the `password:` line:
   ```
   port: 22
   timeout: 60s
   command_timeout: 30m
   ```
6. Commit with message: "Fix SSH action version for deployment"

This will resolve the SSH authentication failure and allow automated deployment to work.