# Maddy Setup Troubleshooting Guide

## Expected Outputs

### `sudo systemctl status maddy` - What You Should See:

**If Maddy is Running Successfully:**
```
● maddy.service - Maddy Mail Server
   Loaded: loaded (/etc/systemd/system/maddy.service; enabled; vendor preset: enabled)
   Active: active (running) since [date] [time]; [duration] ago
     Docs: https://maddy.email
 Main PID: [number] (maddy)
    Tasks: [number] (limit: [number])
   Memory: [amount]MB
   CGroup: /system.slice/maddy.service
           └─[number] /usr/local/bin/maddy -config /etc/maddy/maddy.conf

[timestamp] [hostname] systemd[1]: Started Maddy Mail Server.
[timestamp] [hostname] maddy[number]: starting...
[timestamp] [hostname] maddy[number]: smtp: listening on 0.0.0.0:25
```

**If Maddy Failed to Start:**
```
● maddy.service - Maddy Mail Server
   Loaded: loaded (/etc/systemd/system/maddy.service; enabled; vendor preset: enabled)
   Active: failed (Result: exit-code) since [date] [time]; [duration] ago
   Process: [number] ExecStart=/usr/local/bin/maddy -config /etc/maddy/maddy.conf (code=exited, status=1/FAILURE)
```

### `sudo journalctl -u maddy -f` - What You Should See:

**Successful Startup:**
```
[timestamp] [hostname] systemd[1]: Started Maddy Mail Server.
[timestamp] [hostname] maddy[number]: starting maddy [version]
[timestamp] [hostname] maddy[number]: effective config: /etc/maddy/maddy.conf
[timestamp] [hostname] maddy[number]: smtp: listening on 0.0.0.0:25
[timestamp] [hostname] maddy[number]: webhook: target configured: https://musical-walleye-79.replit.app/api/webhook/email-inbound
```

**When Email Arrives (After DNS Propagation):**
```
[timestamp] [hostname] maddy[number]: smtp: accepted mail from sender@example.com
[timestamp] [hostname] maddy[number]: webhook: delivering to https://musical-walleye-79.replit.app/api/webhook/email-inbound
[timestamp] [hostname] maddy[number]: webhook: delivery successful (200 OK)
```

## Common Issues & Solutions

### Issue 1: "Permission denied" or "maddy user doesn't exist"
**Solution:**
```bash
sudo useradd -r -s /bin/false -d /var/lib/maddy maddy
sudo chown maddy:maddy /var/lib/maddy
sudo systemctl restart maddy
```

### Issue 2: "Config file not found"
**Solution:**
```bash
sudo ls -la /etc/maddy/maddy.conf
# If file doesn't exist, recreate it with the installation commands
```

### Issue 3: "Port 25 already in use" 
**Solution:**
```bash
sudo netstat -tulpn | grep :25
sudo systemctl stop postfix  # If postfix is running
sudo systemctl disable postfix
sudo systemctl restart maddy
```

### Issue 4: "Failed to bind to 0.0.0.0:25"
**Solution:**
```bash
# Check if port 25 is blocked by firewall
sudo ufw status
sudo ufw allow 25/tcp
sudo systemctl restart maddy
```

### Issue 5: Webhook Not Receiving Emails
**Check:**
1. DNS propagation: `dig MX addypin.com`
2. Maddy logs: `sudo journalctl -u maddy -f`
3. Replit webhook endpoint is accessible
4. Email sent to valid shortcode format

## Testing Commands

### Check DNS Propagation:
```bash
dig MX addypin.com
nslookup addypin.com
```

### Test SMTP Connection:
```bash
telnet 155.94.144.191 25
# Should connect and show SMTP banner
```

### Check Maddy Configuration:
```bash
sudo -u maddy /usr/local/bin/maddy -config /etc/maddy/maddy.conf -debug
```

### Monitor Real-time Logs:
```bash
sudo journalctl -u maddy -f --no-pager
```

## Next Steps After Success

1. **DNS Check**: Verify MX record points to 155.94.144.191
2. **Wait for Propagation**: 24-48 hours for global DNS update
3. **Test Email**: Send to `r46n3k@addypin.com`
4. **Monitor Logs**: Watch both Maddy and Replit webhook logs
5. **Verify Auto-response**: Check branded email delivery

Your email system will be fully operational once DNS propagates!