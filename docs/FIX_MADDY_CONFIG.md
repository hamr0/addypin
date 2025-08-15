# Fix Maddy Configuration - Add Required TLS Directive

## The Issue
Maddy requires a `tls` directive in the configuration file.

## Quick Fix
```bash
# Update the config file to include TLS directive
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

# Restart service
sudo systemctl restart maddy
sudo systemctl status maddy

# Check logs for success
sudo journalctl -u maddy -f
```

## Expected Success Output
- `systemctl status maddy` shows "Active: active (running)"
- `journalctl -u maddy -f` shows "smtp: listening on 0.0.0.0:25"
- No more configuration errors

## Why TLS is Off
For email forwarding to webhook, we don't need TLS encryption since we're just routing to your Replit app. Once this works, we can enable TLS later if needed.