# GitHub Workflow Cleanup - August 22, 2025

## Issue
Multiple conflicting workflows were running simultaneously causing deployment failures:
- deploy_clean.yml (old deployment - removed)
- deploy-simple.yml (current deployment - disabled auto-trigger)  
- pr-checks.yml (disabled auto-trigger)
- test-ssh.yml (duplicate SSH test - removed)
- test-ssh-only.yml (focused SSH test - kept)

## Resolution
1. **Removed duplicate/conflicting workflows**
2. **Disabled auto-triggers** on deployment workflows
3. **Kept focused SSH-only test** for debugging

## Next Steps
1. Test SSH connection via `test-ssh-only.yml` workflow
2. Fix SSH authentication issues
3. Re-enable deployment workflow once SSH works
4. Establish single working CI/CD pipeline

## Current Active Workflows
- `test-ssh-only.yml` - Manual trigger only, for SSH debugging
- `deploy-simple.yml` - Manual trigger only, disabled until SSH fixed  
- `pr-checks.yml` - Manual trigger only, disabled until SSH fixed