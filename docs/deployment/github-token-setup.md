# GitHub Personal Access Token Setup (Simpler Solution)

## Alternative to SSH Keys: Personal Access Token

Since SSH key setup failed, let's use a Personal Access Token - much simpler and works immediately.

### Step 1: Create Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "VPS Deployment"
4. Expiration: "No expiration" (or 1 year)
5. Scopes: Check "repo" (full repository access)
6. Click "Generate token"
7. **COPY THE TOKEN** (starts with ghp_...)

### Step 2: Update VPS Deployment Script
Run this on your VPS (replace YOUR_TOKEN with the actual token):

```bash
# Edit the deployment script to use token authentication
sed -i 's|git clone git@github.com:hamr0/addypin.git|git clone https://YOUR_TOKEN@github.com/hamr0/addypin.git|g' /opt/addypin/deploy.sh

# Or manually edit with nano:
nano /opt/addypin/deploy.sh
# Find line 24 and change it to:
# git clone https://YOUR_TOKEN@github.com/hamr0/addypin.git addypin-repo
```

### Step 3: Test Deployment
```bash
/opt/addypin/deploy.sh
```

## Example Token URL Format
```
https://ghp_1234567890abcdef1234567890abcdef12345678@github.com/hamr0/addypin.git
```

This method is:
- ✅ Simpler than SSH keys
- ✅ Works immediately 
- ✅ No complex setup required
- ✅ Easy to revoke if needed