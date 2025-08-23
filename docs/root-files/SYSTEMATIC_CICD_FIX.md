# Systematic CI/CD Fix Plan

## Problem Analysis
CI/CD deployment failing at SSH/SCP step with exit code 1/5. Need to isolate and fix authentication issues before attempting full deployment.

## Systematic Approach

### Step 1: Repository Synchronization ✅
- Create fix branch from main
- Commit all configuration changes  
- Push to maintain consistency between Replit/GitHub/VPS

### Step 2: SSH Isolation Testing
- Created minimal SSH-only workflow (`.github/workflows/test-ssh-only.yml`)
- Tests basic SSH connection, directory access, file transfer
- Isolates authentication issues from deployment complexity

### Step 3: Authentication Debugging
Based on SSH test results:
- **If SSH works**: Issue is in deployment script logic
- **If SSH fails**: Need to verify/update secrets in GitHub

### Step 4: Incremental Deployment Testing  
Once SSH works:
- Test file transfer only
- Test basic Docker commands
- Test full deployment pipeline

### Step 5: Production Deployment
- Merge working CI/CD configuration
- Deploy through GitHub Flow
- Verify production API functionality

## Current Status
- Branch: `fix/cicd-ssh-authentication`
- Next: Run SSH isolation test to identify exact failure point
- Goal: Systematic resolution without further sync issues

## Secrets to Verify
- SSH_HOST: VPS IP address
- SSH_USERNAME: VPS username (likely 'root')
- SSH_PASSWORD: VPS password
- VPS_DATABASE_PASSWORD: PostgreSQL password