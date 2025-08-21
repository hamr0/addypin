# Phase 2: Docker Blueprint Creation

## Environment Analysis Summary

### Critical Findings from Forensic Audit
1. **Runtime**: Node.js 20.19.3, NPM 10.8.2 (exact versions)
2. **OS**: NixOS-based container (NOT Ubuntu/Debian)
3. **Build Tools**: gcc, g++, make in `/nix/store/` paths
4. **Dependencies**: 88 packages successfully installed and working
5. **Build Process**: Vite frontend + ESBuild backend bundling works perfectly
6. **Working Directory**: `/home/runner/workspace`
7. **Process**: tsx transpiler runs development, node runs production

### Root Cause of Previous Docker Failures
- **Wrong Base Image**: Used Ubuntu (apt-based) instead of Node.js official image
- **Missing Build Tools**: Native modules require gcc/g++/make
- **Permission Issues**: Tried to replicate NixOS paths in Ubuntu
- **Dependency Mismatch**: Ubuntu package names ≠ NixOS packages

## Docker Blueprint

### 1. Base Image Selection
```dockerfile
FROM node:20.19.3-bullseye-slim
```
**Rationale**: Exact Node.js version match, Debian-slim for build tools compatibility

### 2. System Dependencies
```dockerfile
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3 \
    && rm -rf /var/lib/apt/lists/*
```
**Rationale**: Provides build tools that Replit's NixOS environment has

### 3. Working Directory Setup
```dockerfile
WORKDIR /home/runner/workspace
```
**Rationale**: Exact path match to Replit environment

### 4. Dependency Installation Strategy
```dockerfile
COPY package*.json ./
RUN npm ci --only=production
```
**Rationale**: Uses exact package-lock.json for identical dependency tree

### 5. Application Files
```dockerfile
COPY . .
RUN npm run build
```
**Rationale**: Replicates the successful build process

### 6. Runtime Configuration
```dockerfile
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
```
**Rationale**: Matches Replit's production startup process

## Complete Dockerfile

```dockerfile
# Use exact Node.js version from Replit
FROM node:20.19.3-bullseye-slim

# Install build tools (equivalent to NixOS build tools)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to match Replit
WORKDIR /home/runner/workspace

# Create non-root user matching Replit
RUN groupadd -r runner && useradd -r -g runner runner
RUN chown -R runner:runner /home/runner/workspace

# Copy package files first for better caching
COPY --chown=runner:runner package*.json ./

# Switch to runner user
USER runner

# Install dependencies with exact versions
RUN npm ci --only=production

# Copy application code
COPY --chown=runner:runner . .

# Build the application (matches Replit build process)
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the application (matches Replit startup)
CMD ["npm", "start"]
```

## Docker Compose Configuration

```yaml
version: '3.8'
services:
  addypin:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Key Differences from Previous Attempts

### ✅ What This Blueprint Fixes
1. **Correct Base Image**: Node.js 20.19.3 (not Ubuntu)
2. **Build Tools Included**: gcc, g++, make for native modules
3. **Exact Dependency Tree**: Uses package-lock.json
4. **Proper User Setup**: Matches Replit's runner user
5. **Working Directory**: Exact path `/home/runner/workspace`
6. **Build Process**: Same Vite + ESBuild workflow

### ❌ What Previous Attempts Did Wrong
1. Used Ubuntu base without Node.js pre-installed
2. Missing build tools for native module compilation
3. Wrong working directory paths
4. Attempted to copy systemd configuration (NixOS-specific)
5. Tried to replicate `/nix/store/` paths in Ubuntu

## Validation Strategy

### Phase 3 Testing Plan
1. **Build Test**: Verify Docker image builds successfully
2. **Dependency Test**: Confirm all 88 packages install correctly  
3. **Runtime Test**: Verify application starts and serves requests
4. **API Test**: Test critical endpoints (/api/stats, /api/pins)
5. **Database Test**: Verify PostgreSQL connection works
6. **Production Deploy**: Deploy to VPS with real database

## Success Criteria
- [ ] Docker build completes without errors
- [ ] All npm dependencies install successfully
- [ ] Application starts on port 5000
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Frontend serves and loads properly

This blueprint directly addresses every failure point from previous attempts by exactly replicating the working Replit environment in Docker.