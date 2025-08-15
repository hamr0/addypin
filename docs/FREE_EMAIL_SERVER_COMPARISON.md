# Free Self-Hosted Email Server Comparison

## Maddy vs iRedMail for Your Use Case

### **🏆 Maddy Mail Server (Recommended)**

**Perfect for your needs because:**
- **Single binary** - No complex setup
- **Go-based** - Modern, fast, reliable
- **Production proven** - Healthchecks.io uses it for 300k+ emails/month
- **Built-in webhook support** - Native HTTP API and webhook features
- **Minimal maintenance** - One daemon replaces Postfix + Dovecot + OpenDKIM

**Setup Simplicity:**
```bash
# Download single binary
wget https://github.com/foxcpp/maddy/releases/latest/download/maddy-linux-amd64
chmod +x maddy-linux-amd64

# Simple config for webhook forwarding
echo "smtp tcp://0.0.0.0:25 {
    source addypin.com {
        deliver_to webhook https://your-app.replit.app/api/webhook/email-inbound
    }
}" > maddy.conf

# Run
./maddy-linux-amd64 -config maddy.conf
```

**Cost:** 100% Free + Your existing server

---

### **iRedMail (More Complex)**

**Challenges for your use case:**
- **Complex setup** - Full mail server with many components
- **Webhook support** - Only in paid Enterprise Edition
- **Community edition** - Requires custom plugin development
- **Maintenance heavy** - Multiple components to manage

**Would require:**
- Custom iRedAPD plugin development
- Postfix/Dovecot configuration
- Multiple service management

**Cost:** Free (community) or $200/year (enterprise with webhooks)

---

## **Direct Recommendation: Use Maddy**

For your simple email auto-responder:

### **Complete Setup Guide**

1. **Install Maddy on any server** (your existing VPS)
2. **Configure webhook forwarding**:
```
smtp tcp://0.0.0.0:25 {
    source addypin.com {
        deliver_to webhook https://your-replit-app.replit.app/api/webhook/email-inbound
    }
}
```
3. **Update DNS**: Point MX to your server
4. **Done** - emails to `ak7n1z@addypin.com` forward to your webhook

### **Why Maddy Wins:**
- ✅ **Free and open source**
- ✅ **No monthly costs**
- ✅ **Single binary deployment**
- ✅ **Built-in webhook support**
- ✅ **Minimal complexity**
- ✅ **Production-ready** (300k+ emails/month proven)

Your existing webhook endpoint will handle the forwarded emails perfectly. This gives you complete email independence with zero ongoing costs and minimal complexity.

### **Alternative: Mox**
If Maddy doesn't work out, **Mox** is another modern Go mail server with similar simplicity and built-in webhook support.