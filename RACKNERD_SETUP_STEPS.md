# RackNerd VPS Setup for addypin.com Email Server

## What You Need From Your End:

### **1. Purchase RackNerd VPS**
**No API tokens needed** - this is a regular VPS purchase:

1. **Visit**: https://www.racknerd.com/NewYear/
2. **Choose plan**: 1GB KVM VPS - $11.29/year
3. **Select location**: US East Coast (closest to Replit)
4. **Operating System**: Ubuntu 22.04 LTS
5. **Payment**: Credit card, PayPal, etc.
6. **Account setup**: Create RackNerd account

### **2. What RackNerd Will Give You:**
After purchase, you'll receive:
- **Server IP address** (this is what we need!)
- **Root password** 
- **SSH access details**
- **Server management panel access**

### **3. What I Need From You:**
Once you complete the purchase:
- **Server IP address** (to update DNS records)
- **SSH access confirmation** (so you can run setup commands)

## **Complete Setup Process:**

### **Step 1: Purchase & Setup (Your Part)**
1. Buy the VPS plan
2. Wait for server provisioning (usually instant)
3. Note down the IP address
4. Test SSH access: `ssh root@YOUR-SERVER-IP`

### **Step 2: DNS Records (Your Part)**
Update your domain DNS with your server IP (155.94.144.191):
```
MX Record: addypin.com → 10 155.94.144.191
TXT Record: addypin.com → "v=spf1 mx -all"
TXT Record: _dmarc.addypin.com → "v=DMARC1; p=none; rua=mailto:admin@addypin.com"
```

### **Step 3: Maddy Installation (My Guide)**
I've already created the complete installation commands in `MADDY_SETUP_GUIDE.md`. You'll just:
1. SSH into your server
2. Copy/paste the one-command setup
3. Maddy installs and starts automatically

### **Step 4: Testing**
Once DNS propagates (24-48 hours):
- Send email to `r46n3k@addypin.com`
- Receive branded auto-response
- Complete email independence achieved!

## **No Complex Setup Required**
- **No API integration** with RackNerd
- **No programming** needed
- **Simple VPS purchase** → SSH → Copy/paste commands → Done
- **Total cost**: $11.29/year for complete email system

## **Support Available**
- **RackNerd support**: 10-minute average response for server issues
- **My guides**: Complete step-by-step instructions ready
- **Community**: RackNerd has excellent community support

Ready to purchase the VPS? The entire process takes about 30 minutes once you have the server.