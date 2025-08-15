# CentOS/RHEL Maddy Installation Fix

## The Issues Identified:
1. Binary download failed (network or URL issue)
2. Your server uses CentOS/RHEL (yum/dnf) not Ubuntu (apt)
3. No binary exists to execute

## Complete Fix Commands for CentOS

Run these commands on your RackNerd server:

```bash
# First, let's check what we have and clean up
ls -la /usr/local/bin/maddy
sudo rm -f /usr/local/bin/maddy

# Check OS version
cat /etc/os-release

# Install dependencies
sudo yum update -y
sudo yum install -y wget curl

# Download Maddy binary (try different method)
cd /tmp
wget -O maddy-linux-amd64 https://github.com/foxcpp/maddy/releases/download/v0.7.1/maddy-linux-amd64

# If wget fails, try curl
curl -L -o maddy-linux-amd64 https://github.com/foxcpp/maddy/releases/download/v0.7.1/maddy-linux-amd64

# Verify download
ls -la maddy-linux-amd64
file maddy-linux-amd64

# Make executable and move
chmod +x maddy-linux-amd64
sudo mv maddy-linux-amd64 /usr/local/bin/maddy

# Test binary
/usr/local/bin/maddy --version

# If version works, restart service
sudo systemctl restart maddy
sudo systemctl status maddy
```

## Alternative: Compile from Source

If binary still doesn't work (wrong architecture), install Go and compile:

```bash
# Install Go
sudo yum install -y golang git

# Compile Maddy from source
cd /tmp
git clone https://github.com/foxcpp/maddy.git
cd maddy
go build -o maddy ./cmd/maddy

# Test and install
./maddy --version
sudo mv maddy /usr/local/bin/maddy

# Restart service
sudo systemctl restart maddy
sudo systemctl status maddy
```

## Quick Test Commands

After installation, verify everything works:

```bash
# Check binary
/usr/local/bin/maddy --version

# Check service
sudo systemctl status maddy

# Check logs
sudo journalctl -u maddy -f

# Check config file
sudo cat /etc/maddy/maddy.conf

# Test SMTP port
sudo netstat -tulpn | grep :25
```