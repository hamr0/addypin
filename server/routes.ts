import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertPinSchema, insertAnalyticsSchema, pins } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { analyticsService } from "./services/analytics";
import { umamiService } from "./services/umami";

import { requireAuth } from "./middleware/auth";
import { 
  pinCreationLimiter, 
  dailyPinLimiter, 
  generalLimiter, 
  antibotMiddleware 
} from "./middleware/rateLimiter";
import { 
  honeypotMiddleware, 
  timingAnalysisMiddleware 
} from "./middleware/security";
import { securityLogger } from "./services/securityLogger";
import { sendMapAutoResponse } from "./services/email-autoresponder";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply general rate limiting to all routes
  app.use('/api', generalLimiter);

  // Generate shortcode helper
  function generateShortcode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create new pin (open access with comprehensive protection)
  app.post("/api/pins", 
    antibotMiddleware, 
    timingAnalysisMiddleware,
    honeypotMiddleware,
    pinCreationLimiter, 
    dailyPinLimiter, 
    async (req, res) => {
    try {
      const validatedData = insertPinSchema.parse(req.body);
      
      // Check email-based pin limit (5 pins max per email)
      if (validatedData.createdBy) {
        const pinCount = await storage.getPinCountByEmail(validatedData.createdBy);
        if (pinCount >= 5) {
          return res.status(400).json({ 
            message: "addypin limit reached. You can have a maximum of 5 registered addypins per email address.",
            code: "PIN_LIMIT_EXCEEDED"
          });
        }
      }
      
      // Check for duplicate coordinates per email (only if email provided)
      if (validatedData.createdBy) {
        const duplicatePin = await db.select().from(pins).where(
          and(
            eq(pins.latitude, validatedData.latitude),
            eq(pins.longitude, validatedData.longitude),
            eq(pins.createdBy, validatedData.createdBy),
            eq(pins.isActive, true)
          )
        );
        
        if (duplicatePin.length > 0) {
          return res.status(400).json({
            message: "You already have an addypin at these exact coordinates.",
            code: "DUPLICATE_COORDINATES",
            existingShortcode: duplicatePin[0].shortcode
          });
        }
      }

      // Generate unique shortcode
      let shortcode: string;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        shortcode = generateShortcode();
        const existing = await storage.getPinByShortcode(shortcode);
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Failed to generate unique shortcode" });
      }

      // Create pin with expiry if no email provided
      const expiresAt = validatedData.createdBy 
        ? null 
        : new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

      const pinData = {
        ...validatedData,
        shortcode,
        expiresAt,
        isActive: true
      };

      const pin = await storage.createPin(pinData);
      
      // Track creation analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "creation",
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      // Log security info
      securityLogger.logPinCreation(req.ip || '127.0.0.1', pin.shortcode, !!validatedData.createdBy);

      res.status(201).json({
        pin,
        message: validatedData.createdBy 
          ? "addypin created successfully! It's saved permanently."
          : "addypin created successfully! It will be deleted in 72 hours unless you add an email."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid pin data", 
          errors: error.errors 
        });
      }
      console.error("Error creating pin:", error);
      res.status(500).json({ message: "Failed to create pin" });
    }
  });

  // Get pin by shortcode
  app.get("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);
      
      if (!pin) {
        return res.status(404).json({ message: "Wrong addypin" });
      }

      res.json({ pin });
    } catch (error) {
      console.error("Error fetching pin:", error);
      res.status(500).json({ message: "Failed to fetch pin" });
    }
  });

  // Get map links for coordinates
  app.get("/api/map-links/:lat/:lng", async (req, res) => {
    try {
      const { lat, lng } = req.params;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const mapLinks = {
        "Google Maps": `https://www.google.com/maps?q=${latitude},${longitude}`,
        "Apple Maps": `https://maps.apple.com/?q=${latitude},${longitude}`,
        "Waze": `https://waze.com/ul?q=${latitude}%2C${longitude}&navigate=yes`,
        "HERE WeGo": `https://wego.here.com/directions/mix//${latitude},${longitude}`,
        "MapQuest": `https://www.mapquest.com/directions/to/us/${latitude},${longitude}`,
        "Maps.me": `https://maps.me/map/${latitude},${longitude}`,
        "OpenStreetMap": `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
        "Bing Maps": `https://www.bing.com/maps?q=${latitude},${longitude}`,
        "TomTom": `https://www.tomtom.com/en_us/maps/map?lat=${latitude}&lng=${longitude}`,
        "Citymapper": `https://citymapper.com/directions?endcoord=${latitude}%2C${longitude}`,
        "OsmAnd": `https://osmand.net/map#16/${latitude}/${longitude}`,
        "Sygic Maps": `https://www.sygic.com/en/gps-navigation-maps/sygic-maps`,
        "Badger Maps": `https://www.badgermapping.com/`
      };

      res.json(mapLinks);
    } catch (error) {
      console.error("Error generating map links:", error);
      res.status(500).json({ message: "Failed to generate map links" });
    }
  });

  // Track map app click
  app.post("/api/map-click", async (req, res) => {
    try {
      const { shortcode, mapApp } = req.body;
      
      if (!shortcode || !mapApp) {
        return res.status(400).json({ message: "Missing shortcode or mapApp" });
      }

      const pin = await storage.getPinByShortcode(shortcode);
      if (!pin) {
        return res.status(404).json({ message: "Pin not found" });
      }

      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "map_app_click",
        mapApp,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking map click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Send OTP for pin editing
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user has pins
      const userPins = await storage.getPinsByEmail(email);
      if (userPins.length === 0) {
        return res.status(404).json({ 
          message: "No pins found for this email address" 
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 10-minute expiry
      await storage.storeOTP(email, otp, new Date(Date.now() + 10 * 60 * 1000));

      // Send OTP email
      const { sendOTPEmail } = await import('./services/resend-email');
      const emailResult = await sendOTPEmail({ to: email, code: otp });

      if (emailResult.success) {
        res.json({ 
          success: true, 
          message: emailResult.message 
        });
      } else {
        res.status(500).json({ 
          message: emailResult.message 
        });
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post("/api/otp/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      const isValid = await storage.verifyOTP(email, code);
      
      if (isValid) {
        // Get user's pins
        const pins = await storage.getPinsByEmail(email);
        res.json({ 
          success: true, 
          message: "OTP verified successfully",
          pins 
        });
      } else {
        res.status(400).json({ 
          message: "Invalid or expired OTP code" 
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Update pin coordinates (requires OTP verification)
  app.patch("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const { latitude, longitude, email, otpCode } = req.body;
      
      if (!latitude || !longitude || !email || !otpCode) {
        return res.status(400).json({ 
          message: "Latitude, longitude, email, and OTP code are required" 
        });
      }

      // Verify OTP first
      const isValidOTP = await storage.verifyOTP(email, otpCode);
      if (!isValidOTP) {
        return res.status(400).json({ 
          message: "Invalid or expired OTP code" 
        });
      }

      const pin = await storage.getPinByShortcode(shortcode);
      if (!pin) {
        return res.status(404).json({ message: "Pin not found" });
      }

      // Verify pin belongs to the email
      if (pin.createdBy !== email) {
        return res.status(403).json({ 
          message: "You can only edit pins you created" 
        });
      }

      // Check for duplicate coordinates
      const duplicatePin = await db.select().from(pins).where(
        and(
          eq(pins.latitude, latitude),
          eq(pins.longitude, longitude),
          eq(pins.createdBy, email),
          eq(pins.isActive, true)
        )
      );
      
      if (duplicatePin.length > 0 && duplicatePin[0].shortcode !== shortcode) {
        return res.status(400).json({
          message: "You already have an addypin at these exact coordinates.",
          existingShortcode: duplicatePin[0].shortcode
        });
      }

      // Update pin coordinates
      const updatedPin = await storage.updatePinCoordinates(shortcode, latitude, longitude);
      
      // Track analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "coordinate_update",
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      res.json({ 
        success: true, 
        message: "Pin coordinates updated successfully",
        pin: updatedPin 
      });
    } catch (error) {
      console.error("Error updating pin:", error);
      res.status(500).json({ message: "Failed to update pin" });
    }
  });

  // Get analytics stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await analyticsService.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin endpoint to get comprehensive analytics (protected)
  app.get("/api/analytics/comprehensive", async (req, res) => {
    try {
      const stats = await analyticsService.getComprehensiveAnalytics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching comprehensive analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Delete pin
  app.delete("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      
      const deleted = await storage.deletePin(shortcode);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pin not found" });
      }

      res.json({ success: true, message: "Pin deleted successfully" });
    } catch (error) {
      console.error("Error deleting pin:", error);
      res.status(500).json({ message: "Failed to delete pin" });
    }
  });

  // Security stats endpoint (for monitoring)
  app.get("/api/security/stats", async (req, res) => {
    try {
      const securityStats = securityLogger.getStats();
      res.json(securityStats);
    } catch (error) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ error: "Failed to fetch security stats" });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { email, subject, message } = req.body;

      if (!email || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Log to console for review - simple approach without database complexity
      const timestamp = new Date().toISOString();
      console.log('📧 CONTACT FORM SUBMISSION:');
      console.log(`From: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log(`Time: ${timestamp}`);
      console.log('---');
      
      res.json({ 
        success: true, 
        message: "Message received and logged for review!" 
      });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Email auto-responder for ak7n1z@addypin.com format
  app.post("/api/email-autorespond", async (req, res) => {
    try {
      const { fromEmail, shortcode } = req.body;

      if (!fromEmail || !shortcode) {
        return res.status(400).json({ error: "Missing email or shortcode" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(fromEmail)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Validate shortcode format (6 characters, alphanumeric)
      const shortcodeRegex = /^[A-Z0-9]{6}$/;
      if (!shortcodeRegex.test(shortcode)) {
        return res.status(400).json({ error: "Invalid shortcode format" });
      }

      const result = await sendMapAutoResponse({ fromEmail, shortcode });
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(404).json({ error: result.message });
      }
    } catch (error) {
      console.error("Email auto-responder error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

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

  // Authentication removed - open access to avoid email limits

  // Handle subdomain patterns for ak7n1z.addypin.com (when custom domain is live)
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    
    // Check for shortcode subdomain pattern: ak7n1z.addypin.com
    const subdomainMatch = host.match(/^([A-Z0-9]{6})\.addypin\.com$/i);
    if (subdomainMatch) {
      const shortcode = subdomainMatch[1].toUpperCase();
      req.params.shortcode = shortcode;
      // Continue to shortcode handler
    }
    next();
  });

  // Handle shortcode URL patterns - /shortcode directly (like /ak7n1z) and subdomains
  app.get("/:shortcode([A-Z0-9]{6})", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);

      if (!pin) {
        // Serve the React app which will handle the 404 display
        const indexPath = process.env.NODE_ENV === 'production' 
          ? path.join(process.cwd(), 'dist', 'index.html')
          : path.join(process.cwd(), 'client', 'index.html');
        return res.sendFile(indexPath);
      }

      // Track click analytics for visiting the pin page
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "click",
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      // Serve the React app which will show the RedirectPage with all map options
      const indexPath = process.env.NODE_ENV === 'production' 
        ? path.join(process.cwd(), 'dist', 'index.html')
        : path.join(process.cwd(), 'client', 'index.html');
      res.sendFile(indexPath);
    } catch (error) {
      console.error("Shortcode redirect error:", error);
      res.status(500).send("Server error");
    }
  });

  // Subdomain redirect handling - serve the React app page instead of auto-redirecting
  // This would typically be handled by nginx or similar in production
  app.get("/redirect/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);

      if (!pin) {
        // Serve the React app which will handle the 404 display
        const indexPath = process.env.NODE_ENV === 'production' 
          ? path.join(process.cwd(), 'dist', 'index.html')
          : path.join(process.cwd(), 'client', 'index.html');
        return res.sendFile(indexPath);
      }

      // Track click analytics for visiting the pin page
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "click",
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      // Serve the React app which will show the RedirectPage with all map options
      const indexPath = process.env.NODE_ENV === 'production' 
        ? path.join(process.cwd(), 'dist', 'index.html')
        : path.join(process.cwd(), 'client', 'index.html');
      res.sendFile(indexPath);
    } catch (error) {
      console.error("Redirect error:", error);
      res.status(500).send("Server error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}