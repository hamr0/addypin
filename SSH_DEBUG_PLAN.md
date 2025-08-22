# SSH Authentication Debug Plan - August 22, 2025

## Phase 1: Diagnostic Workflow ✅
**Created**: `debug-ssh.yml` with verbose SSH debugging
**Features**:
- Strict permissions (chmod 600 on private key)
- Key format validation (head/tail output)
- Verbose connection attempt (-vvv flag)
- Clear success/failure indication

## Phase 2: Root Cause Analysis (Next)
**Based on verbose output, likely issues**:
1. **VPS permissions**: `~/.ssh/authorized_keys` (600) and `.ssh/` (700)
2. **Key pair mismatch**: Public key in VPS doesn't match private key in GitHub
3. **GitHub secret format**: Private key copied incorrectly 
4. **SSH daemon config**: VPS SSH settings blocking key auth

## Phase 3: Apply Fix to Deployment
**Once SSH works**:
- Update `deploy-simple.yml` with identical SSH handling
- Test full deployment pipeline
- Complete CI/CD automation

## Next Steps
1. Commit and push `debug-ssh.yml`
2. Trigger workflow manually in GitHub Actions
3. Analyze verbose error output
4. Fix identified root cause on VPS
5. Re-test until success

## VPS Commands to Check (When Needed)
```bash
# Check permissions
ls -la ~/.ssh/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Verify authorized_keys content
cat ~/.ssh/authorized_keys

# Check SSH daemon config
sudo cat /etc/ssh/sshd_config | grep -E "(PasswordAuthentication|PubkeyAuthentication|PermitRootLogin)"

# Restart SSH after changes
sudo systemctl restart sshd
```