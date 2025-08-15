# Custom Domain Setup for addypin.com

## Overview
Configure your own domain (addypin.com) instead of using the default .replit.app domain.

## Prerequisites
- Domain registered (addypin.com purchased from registrar)
- Replit deployment already created and running
- Access to your domain's DNS settings

## Step-by-Step Instructions

### 1. Deploy First (If Not Done)
- Complete your Replit deployment to get the default .replit.app URL
- Test that everything works on the default domain

### 2. Domain Configuration in Replit
1. Go to your deployment dashboard in Replit
2. Click on your deployment
3. Navigate to "Settings" or "Domains" section
4. Click "Add Custom Domain"
5. Enter: `addypin.com`
6. Replit will provide DNS configuration details

### 3. DNS Configuration at Your Registrar
Configure these DNS records at your domain registrar:

**For Root Domain (addypin.com):**
- Record Type: `CNAME` or `A`
- Name: `@` or leave blank
- Value: `[provided by Replit]`

**For WWW Subdomain (www.addypin.com):**
- Record Type: `CNAME`
- Name: `www`
- Value: `[provided by Replit]`

### 4. SSL Certificate
- Replit automatically provisions SSL certificates
- HTTPS will be enabled automatically
- May take 10-60 minutes to propagate

### 5. Verification
Test these URLs once DNS propagates:
- `https://addypin.com`
- `https://www.addypin.com`
- Pin creation and all map redirects
- Analytics dashboard at `https://addypin.com/api/stats`

## Expected Timeline
- DNS propagation: 5 minutes - 24 hours
- SSL certificate: 10-60 minutes after DNS
- Full functionality: Usually within 1-2 hours

## Troubleshooting
- Check DNS propagation: `dig addypin.com` or online DNS checker
- Verify SSL: Browser should show secure lock icon
- Contact Replit support if issues persist beyond 24 hours

## Post-Setup Updates
Update any hardcoded URLs in your application to use the new domain if needed.

---
**Note**: Exact steps may vary based on Replit's current interface. Check their deployment documentation for the latest instructions.