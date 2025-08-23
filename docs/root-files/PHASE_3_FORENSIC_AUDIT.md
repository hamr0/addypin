# Phase 3: Forensic Audit Plan - Replit Environment Analysis

## Overview
Systematic analysis of the working Replit environment to create an exact Docker replica, eliminating guesswork and architectural mismatches.

## Phase 1: The Forensic Audit (Capture the "Replit Bible")

### Step 1: Document Core Runtime Environment
**Objective**: Capture exact Node.js and NPM versions

**Commands to run in Replit Shell:**
```bash
# 1.1 Node.js version (determines Docker base image)
node --version

# 1.2 NPM version  
npm --version

# 1.3 Operating system details
uname -a

# 1.4 CPU architecture
arch
```

**Expected Output**: Record exact versions (e.g., v20.19.4, npm 10.8.2)

### Step 2: Capture Explicit Dependencies
**Objective**: Document exact dependency tree as installed in Replit

**Commands to run in Replit Shell:**
```bash
# 2.1 Top-level dependencies (most important)
npm list --depth=0

# 2.2 Full dependency graph (comprehensive)
npm list > replit-dependencies-full.txt

# 2.3 Check for package-lock.json integrity
ls -la package-lock.json

# 2.4 Verify package.json engines field
cat package.json | grep -A 5 '"engines"'
```

**Analysis Points:**
- Compare installed versions vs package.json
- Identify any version mismatches
- Check for missing engines specification

### Step 3: Uncover Hidden System Dependencies
**Objective**: Identify Ubuntu packages that might be required

**Commands to run in Replit Shell:**
```bash
# 3.1 List all installed system packages
apt list --installed > replit-apt-packages.txt

# 3.2 Check for build tools (common requirement)
which python3 python3-pip gcc g++ make

# 3.3 Check for specific tools your app might use
which postgresql-client ffmpeg imagemagick

# 3.4 Look for development headers
dpkg -l | grep -E "(dev|headers)"

# 3.5 Check for native module compilation requirements
npm config get python
npm config get node_gyp
```

**Critical Focus Areas:**
- Build tools: `build-essential`, `make`, `gcc`, `g++`
- Python: `python3`, `python3-pip`, `python3-dev` (for node-gyp)
- Database clients: `postgresql-client`
- Image/media processing: `libvips`, `ffmpeg`, `imagemagick`
- Browser automation: `libnss3`, `libatk-bridge2.0-0` (if using Puppeteer)

### Step 4: Document Execution Environment
**Objective**: Understand how application starts and runs

**Commands to run in Replit Shell:**
```bash
# 4.1 Check current working directory and structure
pwd && ls -la

# 4.2 Examine package.json scripts
cat package.json | grep -A 10 '"scripts"'

# 4.3 Check for .env file structure (don't expose values)
ls -la .env* && echo "--- .env keys (values hidden) ---" && cat .env | grep -o '^[^=]*'

# 4.4 Check active processes when app is running
ps aux | grep -E "(node|npm|tsx)"

# 4.5 Check listening ports
netstat -tlnp | grep -E ":3000|:5000|:8080"

# 4.6 Check environment variables that Node.js sees
node -e "console.log(Object.keys(process.env).filter(k => k.includes('NODE') || k.includes('NPM')).map(k => k + '=' + process.env[k]).join('\n'))"
```

### Step 5: Runtime Behavior Analysis
**Objective**: Understand how the application behaves in Replit

**Commands to run in Replit Shell:**
```bash
# 5.1 Test build process
npm run build

# 5.2 Check what build creates
ls -la dist/ client/dist/ build/ || echo "No build directory found"

# 5.3 Test type checking
npm run check || npm run type-check || echo "No type checking script"

# 5.4 Check if tsx is used directly
which tsx && tsx --version

# 5.5 Simulate production start
NODE_ENV=production npm run start &
sleep 5
curl -I http://localhost:3000 || curl -I http://localhost:5000
pkill -f "node\|npm"
```

## Phase 2: Analysis and Blueprint Creation

### Step 1: Environment Comparison Matrix
Create comparison between:
- **Replit Environment**: Captured data from Phase 1
- **Current Docker Attempt**: What we've been trying
- **Target Docker Environment**: What we need to build

### Step 2: Identify Root Cause Categories
Categorize issues found:
1. **Base Image Mismatch**: Wrong Node.js version
2. **Missing System Dependencies**: Ubuntu packages not installed
3. **Module Import Issues**: ESM vs CommonJS problems
4. **Build Process Issues**: Missing build tools or dependencies
5. **Runtime Environment**: Wrong environment variables or startup sequence

### Step 3: Create Validated Dockerfile
Based on forensic findings, create new Dockerfile with:
- Exact Node.js version match
- Required system dependencies
- Proper user setup (if needed)
- Correct build sequence
- Validated startup command

## Phase 3: Implementation and Validation

### Step 1: Controlled Build Testing
```bash
# Build with verbose output
docker build -t addypin-forensic . --progress=plain

# Test individual layers if build fails
docker run --rm -it node:[VERSION] /bin/bash
```

### Step 2: Runtime Testing
```bash
# Test without external dependencies first
docker run -it --rm -p 3000:3000 addypin-forensic

# Then add environment variables
docker run -it --rm -p 3000:3000 --env-file .env addypin-forensic
```

### Step 3: Integration Testing
- Database connectivity
- API endpoint functionality
- Full application workflow

## Success Criteria
- [ ] Exact Replit environment documented
- [ ] Docker container builds without errors
- [ ] Application starts without crashes
- [ ] All API endpoints respond correctly
- [ ] Database operations work
- [ ] No module import errors
- [ ] Performance comparable to Replit

## Deliverables
1. **Environment Audit Report**: Complete analysis of Replit environment
2. **Validated Dockerfile**: Working container configuration
3. **Docker Compose Setup**: Full orchestration with database
4. **Migration Documentation**: Step-by-step deployment guide

## Next Steps
1. Execute Phase 1 forensic audit in Replit
2. Analyze findings and create blueprint
3. Implement validated Docker solution
4. Test and validate deployment