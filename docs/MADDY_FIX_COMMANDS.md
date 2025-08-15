# Quick Fix for Maddy Startup Issue

## The Problem
Exit code 203/EXEC means the Maddy binary couldn't execute. This is usually because:
1. Binary doesn't have execute permissions
2. Binary is corrupted or incomplete download
3. Wrong architecture (32-bit vs 64-bit)

## Quick Fix Commands

Run these commands on your RackNerd server:

```bash
# Check if Maddy binary exists and permissions
ls -la /usr/local/bin/maddy

# If the file is missing or has wrong permissions, re-download:
sudo rm -f /usr/local/bin/maddy
wget https://github.com/foxcpp/maddy/releases/latest/download/maddy-linux-amd64
chmod +x maddy-linux-amd64
sudo mv maddy-linux-amd64 /usr/local/bin/maddy

# Verify the binary works
/usr/local/bin/maddy --version

# If version shows, restart the service
sudo systemctl restart maddy
sudo systemctl status maddy
```

## Alternative: Install via Package Manager

If the binary still doesn't work, use the official installation method:

```bash
# Add Maddy repository and install
curl -fsSL https://apt.maddy.email/gpg.key | sudo apt-key add -
echo "deb https://apt.maddy.email/ maddy main" | sudo tee /etc/apt/sources.list.d/maddy.list
sudo apt update
sudo apt install maddy

# Create our custom config (overwrite default)
sudo tee /etc/maddy/maddy.conf << 'EOF'
state_dir /var/lib/maddy
runtime_dir /run/maddy

smtp tcp://0.0.0.0:25 {
    hostname addypin.com
    source addypin.com {
        deliver_to webhook {
            target https://musical-walleye-79.replit.app/api/webhook/email-inbound
            timeout 30s
            max_tries 3
        }
    }
    default_source {
        reject 550 5.1.1 "Domain not served here"
    }
}
$(hostname) = addypin.com
$(primary_domain) = addypin.com
EOF

# Restart with package-installed version
sudo systemctl restart maddy
sudo systemctl status maddy
```

## Expected Success Output

After fixing, `sudo systemctl status maddy` should show:
```
● maddy.service - Maddy Mail Server
   Loaded: loaded
   Active: active (running)
```

And `sudo journalctl -u maddy -f` should show:
```
maddy[xxxx]: starting maddy
maddy[xxxx]: smtp: listening on 0.0.0.0:25
```