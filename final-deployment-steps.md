# Final Deployment Steps - Bundle Fix

## Current Issue
- esbuild command not found on VPS
- Need to use npx or npm scripts
- Old broken bundle still deployed

## Run these commands on VPS:

```bash
# 1. Ensure we're in repo directory with node_modules
cd /opt/addypin/addypin-repo

# 2. Use npx to run esbuild with proper bundling
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --packages=bundle

# 3. Verify the new bundle is larger (should include dependencies)
ls -la dist/index.js

# 4. Deploy the fixed bundle
cp dist/index.js /opt/addypin/app/

# 5. Create database schema
npm run db:push

# 6. Start service and test
sudo systemctl start addypin.service
sleep 5
sudo systemctl status addypin.service

# 7. Test manually if service fails
cd /opt/addypin/app
sudo -u appuser /usr/local/bin/node index.js
```

The key fix: `--packages=bundle` instead of `--packages=external` will include all npm dependencies.