# AWS EC2 Setup for Maddy Mail Server

## Security Group Configuration

You have the basic settings, but need to add SMTP:

### Current Settings (Keep These):
- ✅ SSH traffic from anywhere - Port 22
- ✅ HTTPS traffic from internet - Port 443  
- ✅ HTTP traffic from internet - Port 80

### Add This Setting:
```
Type: Custom TCP
Protocol: TCP
Port Range: 25
Source: 0.0.0.0/0
Description: SMTP for incoming email
```

## Complete Setup Steps:

### 1. Launch Instance
- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.nano (sufficient for email forwarding)
- **Key Pair**: Create or use existing
- **Security Group**: Add the SMTP rule above

### 2. After Launch
1. **Note your Public IP**: Find it in EC2 dashboard
2. **Update DNS records** with that IP address
3. **SSH into instance**: `ssh -i your-key.pem ubuntu@YOUR-IP`
4. **Run the one-command setup** from MADDY_SETUP_GUIDE.md

### 3. DNS Records (Replace YOUR-IP with actual IP)
```
MX Record:
Name: addypin.com
Value: 10 YOUR-IP
TTL: 300

TXT Record (SPF):
Name: addypin.com  
Value: "v=spf1 mx -all"
TTL: 300

TXT Record (DMARC):
Name: _dmarc.addypin.com
Value: "v=DMARC1; p=none; rua=mailto:admin@addypin.com"  
TTL: 300
```

### 4. Test
Once DNS propagates (24-48 hours):
- Send email to any valid shortcode: `r46n3k@addypin.com`
- Check logs: `sudo journalctl -u maddy -f`
- Verify auto-response arrives

Your email system will be completely self-hosted with zero monthly costs!