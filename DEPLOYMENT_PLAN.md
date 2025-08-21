# Systematic Deployment Plan: Fix Build Process

## Root Cause: ESBuild External Dependencies
- Current build: `esbuild --packages=external` expects npm modules in production
- Missing: node_modules directory and database schema

## Option A: Bundle Everything (Recommended)
Fix the build process to bundle all dependencies:

```bash
# 1. Stop the failing service
sudo systemctl stop addypin.service

# 2. Go back to source and fix build process
cd /opt/addypin/addypin-repo

# 3. Update build to bundle dependencies
npm run build  # This creates current broken version

# 4. Create proper bundled version
esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --packages=bundle

# 5. Deploy fixed version
cp dist/index.js /opt/addypin/app/

# 6. Create database schema
npm run db:push

# 7. Restart service
sudo systemctl start addypin.service
```

## Option B: Install node_modules in Production
```bash
# Copy package.json and install in production
cp package.json /opt/addypin/app/
cd /opt/addypin/app
npm install --production
```

**Option A is cleaner** - single file deployment without dependency management.