# Fix SSH Key Format Issue

## Problem
GitHub rejected SSH key: "Key is invalid. You must supply a key in OpenSSH public key format"

## Solution: Generate Proper SSH Key

### Run these corrected commands on your VPS:

```bash
# Remove any existing keys
rm -f ~/.ssh/github_deploy*

# Generate proper SSH key (press Enter 3 times for no passphrase)
ssh-keygen -t ed25519 -C "avoidaccess@msn.com" -f ~/.ssh/github_deploy

# Show the properly formatted public key
echo "===== COPY THIS SSH PUBLIC KEY (including ssh-ed25519) ====="
cat ~/.ssh/github_deploy.pub
echo "========================================================="

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/github_deploy

# Create SSH config
cat > ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
    StrictHostKeyChecking no
EOF

# Set proper permissions
chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/github_deploy
chmod 644 ~/.ssh/github_deploy.pub
```

### Key Format Check
The public key should start with `ssh-ed25519` and look like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx avoidaccess@msn.com
```

### Test Connection
```bash
# Test GitHub connection
ssh -T git@github.com
```

Expected response:
```
Hi amrhas82! You've successfully authenticated, but GitHub does not provide shell access.
```

### Then Run Deployment
```bash
/opt/addypin/deploy.sh
```