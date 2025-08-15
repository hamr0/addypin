# Final Maddy Installation Commands

## The Issue
Configuration is perfect, but the binary `/usr/local/bin/maddy` doesn't exist. Need to download and install the actual Maddy binary.

## Run These Commands on Your Server:

```bash
# Go to temp directory
cd /tmp

# Clean up any previous attempts
sudo rm -f /usr/local/bin/maddy
rm -f maddy*

# Download the tarball (this should work)
wget https://github.com/foxcpp/maddy/releases/download/v0.8.1/maddy-0.8.1-linux-amd64.tar.gz

# Check if download succeeded (should be several MB)
ls -la maddy-0.8.1-linux-amd64.tar.gz

# Extract the tarball
tar -xzf maddy-0.8.1-linux-amd64.tar.gz

# List contents to find the maddy binary
ls -la

# Make executable and install (adjust path if needed)
chmod +x maddy
sudo mv maddy /usr/local/bin/maddy

# Verify installation
/usr/local/bin/maddy --version

# Now restart the service (config is already good)
sudo systemctl restart maddy
sudo systemctl status maddy

# Check logs
sudo journalctl -u maddy -f
```

## If tarball download fails, compile from source:

```bash
# Install Go for AlmaLinux
sudo yum install -y golang git

# Set environment
export GOPATH=$HOME/go

# Clone and build
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

## Expected Success Output

After successful installation:
- `maddy --version` should show version info
- `systemctl status maddy` should show "Active: active (running)"
- `journalctl -u maddy -f` should show "smtp: listening on 0.0.0.0:25"

Your configuration is already perfect - we just need the binary!