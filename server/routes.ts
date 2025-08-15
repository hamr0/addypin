// Email webhook for receiving emails (when MX records are configured)
app.post("/api/webhook/email-inbound", async (req, res) => {
  try {
    const { to, from, subject, html, text } = req.body;
    
    // Extract shortcode from recipient email (ak7n1z@addypin.com)
    const emailMatch = to.match(/^([A-Z0-9]{6})@addypin\.com$/i);
    if (!emailMatch) {
      return res.status(400).json({ error: "Invalid recipient format" });
    }
    
    const shortcode = emailMatch[1].toUpperCase();
    
    // Log the incoming email
    console.log('📧 INCOMING EMAIL:');
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`Shortcode: ${shortcode}`);
    console.log('---');
    
    // Send auto-response
    const result = await sendMapAutoResponse({ fromEmail: from, shortcode });
    
    if (result.success) {
      res.json({ success: true, message: "Auto-response sent" });
    } else {
      res.status(404).json({ error: result.message });
    }
  } catch (error) {
    console.error("Email webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});