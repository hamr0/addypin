#!/bin/bash
# Setup script for private GitHub repository access

echo "=== Setting up Private GitHub Repository Access ==="

# Commands to run on VPS
cat << 'VPS_COMMANDS'

# On your VPS, run these commands:

# 1. Generate SSH key for GitHub access
ssh-keygen -t rsa -b 4096 -C "avoidaccess@msn.com" -f ~/.ssh/github_deploy -N ""

# 2. Display the public key (copy this)
echo "Copy this SSH public key to GitHub:"
echo "======================================="
cat ~/.ssh/github_deploy.pub
echo "======================================="

# 3. Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/github_deploy

# 4. Create SSH config for GitHub
cat > ~/.ssh/config << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF

# 5. Test GitHub connection
ssh -T git@github.com

VPS_COMMANDS

echo ""
echo "After running VPS commands:"
echo "1. Copy the SSH public key"
echo "2. Go to GitHub.com → Settings → SSH and GPG keys"
echo "3. Add the public key with title 'VPS Deploy Key'"
echo "4. Update deployment script to use SSH instead of HTTPS"