# DNS Records for RackNerd Server (155.94.144.191)

## Exact DNS Records to Add

### 1. Replace Existing MX Record
```
Record Type: MX
Name: addypin.com (or @)
Value: 10 155.94.144.191
TTL: 300
Priority: Important - This must replace your current MX record
```

### 2. Add SPF Record (Prevents Email Spoofing)
```
Record Type: TXT
Name: addypin.com (or @)
Value: "v=spf1 mx -all"
TTL: 300
```

### 3. Add DMARC Record (Email Security Policy)
```
Record Type: TXT
Name: _dmarc.addypin.com
Value: "v=DMARC1; p=none; rua=mailto:admin@addypin.com"
TTL: 300
```

## SSH Connection Command
```bash
ssh root@155.94.144.191
```

## Installation Commands (Run on Server)
```bash
# Complete Maddy installation (copy/paste as one block)
sudo apt update && sudo apt upgrade -y
wget https://github.com/foxcpp/maddy/releases/latest/download/maddy-linux-amd64
chmod +x maddy-linux-amd64
sudo mv maddy-linux-amd64 /usr/local/bin/maddy
sudo useradd -r -s /bin/false -d /var/lib/maddy maddy
sudo mkdir -p /var/lib/maddy /etc/maddy
sudo chown maddy:maddy /var/lib/maddy

# Create config file
sudo tee /etc/maddy/maddy.conf << 'EOF'
state_dir /var/lib/maddy
runtime_dir /run/maddy

# TLS configuration (required directive)
tls off

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

# Create and start service
sudo tee /etc/systemd/system/maddy.service << 'EOF'
[Unit]
Description=Maddy Mail Server
After=network.target
Wants=network.target

[Service]
Type=notify
User=maddy
Group=maddy
ExecStart=/usr/local/bin/maddy -config /etc/maddy/maddy.conf
ExecReload=/bin/kill -USR1 $MAINPID
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
EOF

# Start Maddy
sudo systemctl daemon-reload
sudo systemctl enable maddy
sudo systemctl start maddy
sudo systemctl status maddy
```

## Testing Your Setup

### 1. Check Maddy Status
```bash
sudo systemctl status maddy
sudo journalctl -u maddy -f
```

### 2. Test Email (After DNS Propagation)
Send test email to any valid shortcode: `r46n3k@addypin.com`

### 3. Monitor Logs
```bash
# Maddy logs
sudo journalctl -u maddy -f

# Your Replit webhook logs
# Check the console in your Replit for incoming webhook requests
```

## Timeline
- **DNS Changes**: 24-48 hours to fully propagate
- **Email System**: Ready immediately after Maddy installation
- **Total Setup Time**: ~15 minutes active work

Your complete email independence system is ready to deploy!