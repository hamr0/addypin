# Complete Postfix Setup for Email Forwarding

## Configure Postfix for addypin.com

```bash
# Create webhook script first
sudo tee /usr/local/bin/email-webhook << 'EOF'
#!/bin/bash
# Extract TO address and forward to webhook
while IFS= read -r line; do
    if [[ $line =~ ^To:.*([A-Z0-9]{6}@addypin\.com) ]]; then
        TO_ADDR="${BASH_REMATCH[1]}"
    fi
    EMAIL_CONTENT+="$line"$'\n'
done

# Forward to webhook if shortcode found
if [[ -n "$TO_ADDR" ]]; then
    curl -X POST https://musical-walleye-79.replit.app/api/webhook/email-inbound \
        -H "Content-Type: application/json" \
        -d "{\"to\":[\"$TO_ADDR\"],\"from\":\"external@sender.com\",\"subject\":\"Email Forward\",\"body\":\"Email received\"}" \
        --max-time 30 --silent
fi
exit 0
EOF

sudo chmod +x /usr/local/bin/email-webhook

# Configure Postfix main settings
sudo tee /etc/postfix/main.cf << 'EOF'
# Network and identity
myhostname = mail.addypin.com
mydomain = addypin.com
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4

# What domains to accept mail for
mydestination = addypin.com, $myhostname

# Disable local delivery, forward everything
local_transport = error:Local delivery disabled
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases

# Accept mail from anywhere
mynetworks = 0.0.0.0/0
EOF

# Add webhook forwarding to aliases
echo "# Email webhook forwarding" | sudo tee -a /etc/aliases
echo 'root: |"/usr/local/bin/email-webhook"' | sudo tee -a /etc/aliases

# Create catch-all forwarding
sudo tee /etc/postfix/virtual << 'EOF'
@addypin.com root
EOF

# Add virtual alias maps to main.cf
echo "virtual_alias_maps = hash:/etc/postfix/virtual" | sudo tee -a /etc/postfix/main.cf

# Build alias and virtual databases
sudo newaliases
sudo postmap /etc/postfix/virtual

# Test configuration
sudo postfix check

# Start Postfix
sudo systemctl restart postfix
sudo systemctl status postfix

# Check if it's listening on port 25
sudo netstat -tulpn | grep :25
```

## Test Commands
```bash
# Check Postfix status
sudo systemctl status postfix

# Check logs
sudo tail -f /var/log/maillog

# Test webhook script
echo "To: test123@addypin.com" | sudo /usr/local/bin/email-webhook
```