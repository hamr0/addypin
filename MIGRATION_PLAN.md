# SYSTEMATIC REPLIT → VPS MIGRATION PLAN

## Pre-Migration Information Gathering

Before proceeding with the phased approach, I need to collect these critical variables:

### 1. VPS Environment Details
- **VPS Provider**: RackNerd (confirmed)
- **OS Version**: Need to confirm (likely Ubuntu/CentOS)
- **Current Node.js version**: Need to verify
- **Current PostgreSQL status**: Confirmed installed with addypin database
- **Domain configuration**: addypin.com (confirmed)

### 2. Application Configuration
- **Current working port in Replit**: 5000 (confirmed from logs)
- **Target production port**: 3000 (nginx expects this)
- **Database credentials**: Need to confirm VPS PostgreSQL user/password
- **Environment secrets**: RESEND_API_KEY confirmed, others?

### 3. Current State Assessment
- **Working backup location**: `/opt/addypin/production-backups/prod_addypin_working_20250820_142152/`
- **Current broken state**: Service fails due to ESM/dynamic require issues
- **Nginx configuration**: Exists but may need updates

### 4. Migration Scope
- **Database migration**: Need to migrate from Neon to local PostgreSQL
- **Build process**: Need to replace tsx with compiled artifacts
- **Service management**: Replace Replit process with systemd
- **Environment management**: Replace .env auto-loading with systemd environment

## Questions for You:

1. **Should we start fresh or clean the current VPS?** Given the broken state, would you prefer a clean slate approach?

2. **Database migration strategy**: Do you want to export data from Neon and import to VPS PostgreSQL, or start with fresh schema?

3. **Deployment approach**: Should we implement the full CI/CD pipeline from the guide, or focus on manual deployment first?

4. **Risk tolerance**: Should we work on the current VPS or spin up a new one for testing?

Once you confirm these details, I'll execute the phased plan systematically.