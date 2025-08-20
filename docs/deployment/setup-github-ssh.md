# GitHub SSH Authentication Setup

## Issue
Deployment failed: Private repository requires authentication
```
Username for 'https://github.com': amrhas82
Password for 'https://amrhas82@github.com': 
remote: Invalid username or token. Password authentication is not supported for Git operations.
```

## Solution: SSH Key Authentication

### Step 1: Generate SSH Key on VPS
Run these commands on your VPS:

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "avoidaccess@msn.com" -f ~/.ssh/github_deploy -N ""

# Display the public key (copy this entire output)
echo "===== COPY THIS SSH PUBLIC KEY ====="
cat ~/.ssh/github_deploy.pub
echo "=================================="

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/github_deploy

# Create SSH config
cat > ~/.ssh/config << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF
```

### Step 2: Add SSH Key to GitHub
1. Copy the SSH public key from Step 1
2. Go to: https://github.com/settings/ssh
3. Click "New SSH key"
4. Title: "VPS Deploy Key"
5. Paste the public key
6. Click "Add SSH key"

### Step 3: Test SSH Connection
```bash
# Test GitHub connection
ssh -T git@github.com
# Should show: "Hi amrhas82! You've successfully authenticated..."
```

### Step 4: Update Deployment Script
The deployment script is already configured for SSH (git@github.com), so once SSH key is added to GitHub, the deployment will work.

### Step 5: Run Deployment Again
```bash
/opt/addypin/deploy.sh
```