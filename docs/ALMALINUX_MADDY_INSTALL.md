# Maddy Installation for AlmaLinux OS 8

## Your Server Details:
- Hostname: racknerd-47e65b8
- OS: AlmaLinux OS 8 (RHEL-based)
- Primary IP: 155.94.144.191
- Location: Los Angeles DC03
- Package Manager: `yum` or `dnf`

## Working Installation for AlmaLinux

```bash
# Clean up previous attempts
sudo rm -f /usr/local/bin/maddy
cd /tmp
rm -f maddy*

# Install dependencies for AlmaLinux
sudo yum update -y
sudo yum install -y wget curl tar

# Method 1: Try direct binary download
wget -O maddy.tar.gz https://github.com/foxcpp/maddy/releases/download/v0.8.1/maddy-0.8.1-linux-amd64.tar.gz

# Extract tarball (this should work better than direct binary)
tar -xzf maddy.tar.gz
ls -la

# Find and install the maddy binary
find . -name "maddy" -type f
chmod +x ./maddy
sudo mv ./maddy /usr/local/bin/maddy

# Test installation
/usr/local/bin/maddy --version
```

## If tarball method fails, compile from source:

```bash
# Install Go compiler for AlmaLinux
sudo yum install -y golang git

# Set Go environment
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Clone and build
cd /tmp
git clone https://github.com/foxcpp/maddy.git
cd maddy

# Build for Linux
go build -o maddy ./cmd/maddy

# Test and install
./maddy --version
sudo mv maddy /usr/local/bin/maddy
```

## After successful installation:

```bash
# Verify binary works
/usr/local/bin/maddy --version

# Restart maddy service
sudo systemctl restart maddy
sudo systemctl status maddy
sudo journalctl -u maddy -f
```

## DNS Records Ready

Your confirmed IP is **155.94.144.191**. The DNS records I provided earlier are correct:

```
MX Record: addypin.com → 10 155.94.144.191
TXT Record: addypin.com → "v=spf1 mx -all"
TXT Record: _dmarc.addypin.com → "v=DMARC1; p=none; rua=mailto:admin@addypin.com"
```