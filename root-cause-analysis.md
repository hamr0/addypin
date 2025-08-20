# Root Cause Analysis: Why the VPS Deployment is Failing

## The Real Problem
We're getting **exit status 1/FAILURE** (not 203/EXEC anymore). This means Node.js is running but the application is crashing immediately.

## What We Need to Investigate
1. **Application Logs**: What error is the Node.js app throwing?
2. **Database Schema**: Are tables missing? (we dropped the schema)
3. **File Structure**: Is the built application complete?
4. **Dependencies**: Are npm modules available in production?

## Critical Commands to Run for Diagnosis:
```bash
# 1. Get the actual application error logs
journalctl -u addypin.service --lines=50 --no-pager

# 2. Test running the app manually to see crash details
cd /opt/addypin/app
sudo -u appuser /usr/local/bin/node index.js

# 3. Check if database tables exist
sudo -u postgres psql -d addypin -c "\dt"

# 4. Verify file structure is complete
ls -la /opt/addypin/app/
ls -la /opt/addypin/app/public/

# 5. Check if app needs node_modules
file /opt/addypin/app/index.js | head -10
```

## Hypothesis
The ESM bundle might have dependencies that aren't bundled, or database tables are missing after schema reset.

**Stop reactive fixes. Let's see the actual error first.**