# Maddy Configuration with Command-Based Webhook

## Option 1: Use Command Module for Webhook
```bash
# Create webhook script
sudo tee /usr/local/bin/maddy-webhook << 'EOF'
#!/bin/bash
# Read email and forward to webhook

# Extract TO header from email
TO_HEADER=$(grep -i "^To:" | head -1 | cut -d' ' -f2-)

# Forward to webhook
curl -X POST https://musical-walleye-79.replit.app/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d "{\"to\":[\"$TO_HEADER\"],\"from\":\"external@sender.com\",\"subject\":\"Email Forwarded\",\"body\":\"Webhook delivery\"}" \
  --max-time 30
EOF

sudo chmod +x /usr/local/bin/maddy-webhook

# Update Maddy config to use command
sudo tee /etc/maddy/maddy.conf << 'EOF'
state_dir /var/lib/maddy
runtime_dir /run/maddy

tls off

smtp tcp://0.0.0.0:25 {
    hostname addypin.com
    source addypin.com {
        deliver_to command /usr/local/bin/maddy-webhook
    }
    default_source {
        reject 550 5.1.1 "Domain not served here"
    }
}
$(hostname) = addypin.com
$(primary_domain) = addypin.com
EOF

# Restart Maddy
sudo systemctl restart maddy
sudo systemctl status maddy
```

## Option 2: Switch to Simple Postfix (Recommended)
```bash
# Stop Maddy
sudo systemctl stop maddy
sudo systemctl disable maddy

# Install Postfix
sudo yum install -y postfix curl

# Configure Postfix for domain
sudo tee /etc/postfix/main.cf << 'EOF'
mydomain = addypin.com
myhostname = mail.addypin.com
myorigin = $mydomain
inet_interfaces = all
mydestination = $mydomain
local_transport = error:local delivery disabled

# Forward all mail to script
alias_maps = regexp:/etc/postfix/virtual
EOF

# Create forwarding pattern
sudo tee /etc/postfix/virtual << 'EOF'
/^[A-Z0-9]{6}@addypin\.com$/  webhook
EOF

# Add webhook user to aliases
echo "webhook: |/usr/local/bin/maddy-webhook" | sudo tee -a /etc/aliases
sudo newaliases

# Start Postfix
sudo systemctl enable postfix
sudo systemctl start postfix
sudo systemctl status postfix
```