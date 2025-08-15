# Maddy Mail Server Setup for addypin.com

## DNS Records Required

Replace your existing MX record with:

```
Record Type: MX
Name: addypin.com (or @)
Value: 10 your-server-ip-address
TTL: 300
```

**Additional DNS Records for Email Authentication:**

```
# SPF Record
Record Type: TXT
Name: addypin.com (or @)
Value: "v=spf1 mx -all"
TTL: 300

# DMARC Record
Record Type: TXT  
Name: _dmarc.addypin.com
Value: "v=DMARC1; p=none; rua=mailto:admin@addypin.com"
TTL: 300
```

## Complete Maddy Installation

### Step 1: Download and Install
```bash
# Download latest Maddy
wget https://github.com/foxcpp/maddy/releases/latest/download/maddy-linux-amd64
chmod +x maddy-linux-amd64
sudo mv maddy-linux-amd64 /usr/local/bin/maddy

# Create maddy user and directories
sudo useradd -r -s /bin/false -d /var/lib/maddy maddy
sudo mkdir -p /var/lib/maddy /etc/maddy
sudo chown maddy:maddy /var/lib/maddy
```

### Step 2: Configuration File (/etc/maddy/maddy.conf)
```
# Basic Maddy configuration for webhook forwarding
state_dir /var/lib/maddy
runtime_dir /run/maddy

# SMTP server for receiving emails
smtp tcp://0.0.0.0:25 {
    hostname addypin.com
    
    # Handle emails for addypin.com
    source addypin.com {
        # Forward all emails to webhook
        deliver_to webhook {
            target https://your-replit-app.replit.app/api/webhook/email-inbound
            timeout 30s
            max_tries 3
        }
    }
    
    # Reject other domains
    default_source {
        reject 550 5.1.1 "Domain not served here"
    }
}

# Domain configuration
$(hostname) = addypin.com
$(primary_domain) = addypin.com

# DKIM signing (optional but recommended)
dkim {
    domain addypin.com
    selector default
    key_path /var/lib/maddy/dkim/addypin.com_default.key
}

# Enable authentication
auth {
    pass_through
}
```

### Step 3: Generate DKIM Keys (Recommended)
```bash
sudo mkdir -p /var/lib/maddy/dkim
sudo /usr/local/bin/maddy dkim keygen -domain addypin.com -selector default -key /var/lib/maddy/dkim/addypin.com_default.key
sudo chown maddy:maddy /var/lib/maddy/dkim/addypin.com_default.key
```

### Step 4: Create Systemd Service (/etc/systemd/system/maddy.service)
```ini
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
```

### Step 5: Start Maddy
```bash
sudo systemctl daemon-reload
sudo systemctl enable maddy
sudo systemctl start maddy
sudo systemctl status maddy
```

## Webhook Format

Maddy will send HTTP POST requests to your webhook with this format:
```json
{
  "from": "sender@example.com",
  "to": ["ak7n1z@addypin.com"],
  "subject": "Email subject",
  "body": "Email content",
  "headers": {
    "message-id": "...",
    "date": "..."
  }
}
```

## Testing

Once DNS propagates (up to 48 hours):
1. Send email to `r46n3k@addypin.com`
2. Check Maddy logs: `sudo journalctl -u maddy -f`
3. Verify webhook receives the email
4. Confirm auto-response is sent

## Monitoring

```bash
# View logs
sudo journalctl -u maddy -f

# Check status
sudo systemctl status maddy

# Test configuration
sudo -u maddy /usr/local/bin/maddy -config /etc/maddy/maddy.conf -debug
```

## Security Notes

- Port 25 must be open for SMTP
- Consider firewall rules to limit access
- DKIM signing improves deliverability
- Monitor logs for security events

Your webhook endpoint is already built and ready to handle the forwarded emails!