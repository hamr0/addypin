# Email System Monitoring & Testing Guide

## System Status Check Commands (RackNerd Server)

### Check Postfix Status
```bash
ssh root@155.94.144.191
sudo systemctl status postfix
sudo tail -f /var/log/maillog
```

### Test Webhook Script
```bash
echo "To: ak7n1z@addypin.com" | sudo /usr/local/bin/email-webhook
```

### Monitor Port 25
```bash
sudo netstat -tulpn | grep :25
```

## DNS Propagation Testing

### Check from Different Locations
```bash
# Test MX record propagation
dig MX addypin.com @8.8.8.8
dig MX addypin.com @1.1.1.1

# Check from online tools
# https://dnschecker.org (search for: addypin.com MX)
```

## Expected Timeline

**Now to 6 hours**: Some DNS servers updated
**6-24 hours**: Most global DNS updated  
**24-48 hours**: Complete worldwide propagation

## Testing Your Email System

1. **Wait for DNS propagation** (check with dig commands above)
2. **Send test email** to any valid shortcode: `ak7n1z@addypin.com`
3. **Monitor logs**: 
   - Postfix logs: `/var/log/maillog` on server
   - Replit webhook logs: Your app console
4. **Verify auto-response**: Check sender receives branded email

## What Success Looks Like

**Server logs show:**
```
postfix/smtpd: connect from unknown[sender-ip]
postfix/cleanup: message-id accepted
postfix/local: delivered to command: /usr/local/bin/email-webhook
```

**Replit logs show:**
```
📧 INCOMING EMAIL (Postfix):
To: ak7n1z@addypin.com
From: sender@example.com
✅ Auto-response sent successfully
```

**Sender receives**: Branded email with addypin logo and 13 map app links

## Troubleshooting

If emails don't arrive after 48 hours:
1. Check DNS propagation globally
2. Verify Postfix is running and listening on port 25
3. Check server firewall allows port 25
4. Monitor /var/log/maillog for incoming connections

Your system is ready - just waiting for DNS propagation!