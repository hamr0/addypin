# CRITICAL ROOT CAUSE DISCOVERED

## The Real Problem: Build Configuration Issue
**Error**: `Dynamic require of "path" is not supported`
**Location**: `file:///opt/addypin/app/index.js:1:388`

## Analysis:
- **ESBuild bundles with ESM format** but includes dynamic requires
- **Node.js ESM mode** doesn't support dynamic require()
- **Build configuration mismatch** between bundle format and runtime expectations

## The Fix: Correct Build Configuration

### Solution 1: Fix ESBuild Configuration
Update build script to use CommonJS format instead of ESM:

```bash
# In /opt/addypin/addypin-repo
# Edit package.json build script from:
# "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
# To:
# "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist"
```

### Solution 2: Alternative - Use --experimental-modules
```bash
# Or modify systemd service to use:
# ExecStart=/usr/bin/node --experimental-modules index.js
```

### Implementation Steps:
```bash
cd /opt/addypin/addypin-repo
# Fix the build configuration
sed -i 's/--format=esm/--format=cjs/' package.json
npm run build
cp dist/index.js /opt/addypin/app/index.js
systemctl restart addypin
```

**This targets the actual technical issue** instead of environment problems.