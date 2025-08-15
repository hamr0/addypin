# Maddy Download Fix - Multiple Methods

## The Problem
The download failed - only got 9 bytes instead of the full binary. GitHub redirects aren't working properly.

## Method 1: Direct Latest Release
```bash
# Clean up failed download
sudo rm -f /usr/local/bin/maddy
cd /tmp
rm -f maddy-linux-amd64

# Get actual latest release URL
curl -s https://api.github.com/repos/foxcpp/maddy/releases/latest | grep "browser_download_url.*linux-amd64" | cut -d '"' -f 4

# Download using the actual URL (will be something like v0.7.1)
wget https://github.com/foxcpp/maddy/releases/download/v0.7.1/maddy-linux-amd64

# Verify it's a binary (should show "ELF 64-bit")
file maddy-linux-amd64
ls -la maddy-linux-amd64

# Install if binary is good
chmod +x maddy-linux-amd64
sudo mv maddy-linux-amd64 /usr/local/bin/maddy
/usr/local/bin/maddy --version
```

## Method 2: Compile from Source (Backup)
```bash
# Install Go compiler
sudo yum install -y golang git

# Clone and compile
cd /tmp
git clone https://github.com/foxcpp/maddy.git
cd maddy
go build -o maddy ./cmd/maddy

# Test and install
./maddy --version
sudo mv maddy /usr/local/bin/maddy
```

## Method 3: Alternative Mail Server (If Maddy Keeps Failing)
```bash
# Install Postfix with custom script (simpler option)
sudo yum install -y postfix

# Configure for webhook forwarding
# (I can provide Postfix config if needed)
```

## What the File Should Look Like
After successful download, you should see:
```bash
file maddy-linux-amd64
# Output: maddy-linux-amd64: ELF 64-bit LSB executable, x86-64

ls -la maddy-linux-amd64  
# Output: -rwxr-xr-x 1 root root [LARGE_SIZE] Aug 15 XX:XX maddy-linux-amd64
```

NOT:
```bash
file maddy-linux-amd64
# Output: maddy-linux-amd64: ASCII text, with no line terminators (BAD!)

ls -la maddy-linux-amd64
# Output: -rw-r--r-- 1 root root 9 Aug 15 XX:XX maddy-linux-amd64 (TOO SMALL!)
```