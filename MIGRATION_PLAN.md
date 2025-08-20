# Phase 3 Revised: Replicate Replit Environment

## Current Stack Analysis (Keep)
✅ **Infrastructure**: RackNerd VPS, DigitalOcean DNS
✅ **Email**: Resend API (working in Replit)
✅ **Mail Server**: Maddy (for email receiving)
✅ **Secrets**: HashiCorp (if using Vault)
✅ **Database**: PostgreSQL (local on VPS)

## What Needs to Change: Deployment Strategy

### Current Problem
- Trying to bundle complex app into single file
- Fighting Node.js ecosystem patterns
- ESBuild fails on native dependencies

### Solution: Mirror Replit's Working Pattern
```bash
# Phase 3 Revised Execution:

# 1. Deploy complete application structure
cp -r server/ /opt/addypin/app/
cp -r shared/ /opt/addypin/app/
cp -r client/dist/ /opt/addypin/app/public/
cp package.json /opt/addypin/app/
cp drizzle.config.ts /opt/addypin/app/
cp tsconfig.json /opt/addypin/app/

# 2. Install production dependencies
cd /opt/addypin/app
npm install --production

# 3. Use tsx runtime (like Replit)
npm install -g tsx

# 4. Update systemd service to use tsx
ExecStart=/usr/local/bin/tsx server/index.ts

# 5. Create database schema
npm run db:push
```

## Alternative Runtime Options
- **tsx**: TypeScript execution (mirrors Replit exactly)
- **ts-node**: Another TypeScript runtime
- **Bun**: Fast JS runtime with built-in TypeScript support

## Benefits
- Exact replication of working Replit environment
- No bundling complexity
- Native dependency support
- Easy debugging and updates