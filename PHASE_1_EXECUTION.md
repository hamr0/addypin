# Phase 1: Build Pipeline Reconstruction

## Goal: Create reliable build process outputting runnable CommonJS artifacts

### Current Status:
✅ VPS cleaned - no conflicting services
✅ TypeScript config created (tsconfig.server.json)
✅ Production config structure (config/production.js)

### Phase 1 Steps:

#### 1. Fix Package.json Scripts
Need to update scripts to use TypeScript compilation instead of ESM bundling:
```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "npm run clean && npm run build:client && npm run build:server",
  "build:client": "vite build",
  "build:server": "tsc --project tsconfig.server.json",
  "start": "NODE_ENV=production node dist/index.js",
  "clean": "rm -rf dist/"
}
```

#### 2. Fix Database Driver Imports
Replace Neon serverless with standard pg driver for VPS PostgreSQL

#### 3. Test Build Locally
Verify compilation produces working CommonJS artifacts

#### 4. Prepare for VPS Deployment
Create deployment structure ready for systemd service