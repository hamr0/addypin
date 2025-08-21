# Phase 0: Preparation & Foundation Execution

## Decisions Confirmed:
- **Option A**: Clean slate approach
- **Database**: Start fresh on VPS
- **Build**: Replace ESM with TypeScript compilation  
- **Deployment**: Implement full CI/CD pipeline
- **Starting Point**: Phase 0 with working preprod as reference

## Phase 0 Execution Steps:

### VPS Commands to Execute:
```bash
# 1. Stop broken service and isolate
sudo systemctl stop addypin
sudo systemctl disable addypin

# 2. Backup current broken state  
sudo mkdir -p /home/root/migration-backups/$(date +%Y%m%d_%H%M%S)
sudo cp /etc/systemd/system/addypin.service /home/root/migration-backups/$(date +%Y%m%d_%H%M%S)/
sudo cp -r /etc/nginx/sites-available/addypin /home/root/migration-backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# 3. Remove conflicting configurations
sudo rm -f /etc/systemd/system/addypin.service
sudo rm -f /etc/nginx/sites-enabled/addypin
sudo systemctl daemon-reload

# 4. Create clean application directory
sudo rm -rf /opt/addypin/app
sudo mkdir -p /opt/addypin/app
```

### Code Audit & Preparation:
- Pin all dependency versions in package.json
- Create production config structure
- Identify ESM → TypeScript conversion requirements
- Update build scripts for clean compilation

Ready to proceed with Phase 0?