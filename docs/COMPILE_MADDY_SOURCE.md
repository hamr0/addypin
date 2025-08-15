# Compile Maddy from Source - Final Solution

## Install Dependencies First
```bash
# Install required tools for AlmaLinux
sudo yum update -y
sudo yum install -y golang git tar wget

# Verify Go installation
go version
```

## Compile Maddy from Source
```bash
# Go to temp directory
cd /tmp

# Clone Maddy repository
git clone https://github.com/foxcpp/maddy.git
cd maddy

# Build the binary
go build -o maddy ./cmd/maddy

# Test the binary
./maddy --version

# Install the binary
sudo mv maddy /usr/local/bin/maddy

# Verify installation
/usr/local/bin/maddy --version

# Restart the service
sudo systemctl restart maddy
sudo systemctl status maddy

# Check logs
sudo journalctl -u maddy -f
```

## If Git Clone Fails, Alternative Method
```bash
# Download source as zip
wget https://github.com/foxcpp/maddy/archive/refs/heads/master.zip

# Install unzip if needed
sudo yum install -y unzip

# Extract
unzip master.zip
cd maddy-master

# Build
go build -o maddy ./cmd/maddy
sudo mv maddy /usr/local/bin/maddy
```

## Expected Output
After successful compilation:
- `go version` shows Go compiler
- `./maddy --version` shows Maddy version
- `systemctl status maddy` shows "Active: active (running)"
- `journalctl -u maddy -f` shows "smtp: listening on 0.0.0.0:25"