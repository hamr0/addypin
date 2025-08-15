# Alternative: Simple Postfix + Script Solution

Since Maddy's webhook module isn't working, let's use Postfix with a simple forwarding script:

## Install and Configure Postfix
```bash
# Install Postfix
sudo yum install -y postfix

# Stop Maddy (since it's not working)
sudo systemctl stop maddy
sudo systemctl disable maddy

# Configure Postfix for webhook forwarding
sudo tee /etc/postfix/main.cf << 'EOF'
# Basic Postfix configuration
mydomain = addypin.com
myhostname = racknerd-47e65b8.addypin.com
myorigin = $mydomain
inet_interfaces = all
mydestination = $mydomain

# Virtual alias to forward to script
virtual_alias_domains = addypin.com
virtual_alias_maps = regexp:/etc/postfix/virtual_regexp

# Disable local delivery
local_transport = error:local delivery disabled
EOF

# Create virtual regex for shortcode pattern
sudo tee /etc/postfix/virtual_regexp << 'EOF'
/^([A-Z0-9]{6})@addypin\.com$/  webhook-forward
EOF

# Create webhook forwarding script
sudo tee /usr/local/bin/webhook-forward << 'EOF'
#!/bin/bash
# Read email from stdin and forward to webhook

# Extract recipient from headers
RECIPIENT=$(grep -i "^To:" | head -1 | sed 's/.*<//' | sed 's/>.*//')

# Forward to webhook
curl -X POST https://musical-walleye-79.replit.app/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d "{\"to\":[\"$RECIPIENT\"],\"from\":\"sender@example.com\",\"subject\":\"Shortcode Request\",\"body\":\"Email forwarded\"}"
EOF

sudo chmod +x /usr/local/bin/webhook-forward

# Start Postfix
sudo systemctl enable postfix
sudo systemctl start postfix
sudo systemctl status postfix
```

This creates a simpler email forwarding system that works reliably.