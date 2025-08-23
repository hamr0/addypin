# Debug Service Configuration Issue

## Root Cause Analysis: 203/EXEC Error

The systemd service fails because `appuser` cannot access Node.js installed in `/root/.nvm/` (root's home directory).

## Diagnosis Commands:
```bash
# Test if appuser can access Node.js
sudo -u appuser /root/.nvm/versions/node/v20.19.4/bin/node --version

# Check directory permissions
ls -la /root/.nvm/versions/node/v20.19.4/bin/

# Test the exact command that systemd runs
sudo -u appuser -s
cd /opt/addypin/app
/root/.nvm/versions/node/v20.19.4/bin/node index.js
```

## Solution Options:

### Option 1: Install Node.js system-wide
```bash
# Install Node.js globally for all users
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
which node  # Should show /usr/bin/node
```

### Option 2: Copy Node.js to accessible location
```bash
# Copy Node.js to system location
sudo cp -r /root/.nvm/versions/node/v20.19.4/bin/* /usr/local/bin/
sudo chmod +x /usr/local/bin/node
```

### Option 3: Run as root user (less secure)
```bash
# Modify service to run as root
sudo sed -i 's/User=appuser/User=root/' /etc/systemd/system/addypin.service
sudo sed -i 's/Group=appuser/Group=root/' /etc/systemd/system/addypin.service
```