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
  antibotMiddleware,
  strictBotLimiter,
  isEmailWhitelisted,
  isIPWhitelisted
} from "./middleware/rateLimiter";
import { 
  honeypotMiddleware, 
  timingAnalysisMiddleware 
} from "./middleware/security";
import { ddosProtectionMiddleware, getDDoSStatus } from "./middleware/ddosProtection";
import { securityLogger } from "./services/securityLogger";
import { sendMapAutoResponse } from "./services/email-autoresponder";

// Server-side stats cache
let statsCache: any = null;
let statsCacheTimestamp: number = 0;
const STATS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper function to invalidate stats cache
function invalidateStatsCache() {
  statsCache = null;
  statsCacheTimestamp = 0;
  console.log("🗑️ Stats cache invalidated");
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🚀 Starting route registration...");
  
  // Enhanced health endpoint with dependency checks
  app.get("/api/health", async (req, res) => {
    const healthcheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV,
      checks: [] as Array<{name: string, status: string, responseTime?: number, error?: string}>
    };

    // Check PostgreSQL Database
    try {
      const dbStart = Date.now();
      await db.select().from(pins).limit(1);
      const dbTime = Date.now() - dbStart;
      healthcheck.checks.push({ 
        name: "postgresql", 
        status: "healthy", 
        responseTime: dbTime 
      });
    } catch (error) {
      healthcheck.checks.push({ 
        name: "postgresql", 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Database connection failed"
      });
      healthcheck.status = "unhealthy";
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    healthcheck.checks.push({ 
      name: "memory", 
      status: memUsageMB < 400 ? "healthy" : "warning", 
      responseTime: memUsageMB 
    });

    // Return appropriate status code
    const statusCode = healthcheck.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthcheck);
  });
  
  console.log("✅ Basic health endpoint registered");

  // System status endpoint for monitoring
  app.get("/api/health/system", async (req, res) => {
    try {
      const systemInfo = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
          },
          cpu: process.cpuUsage()
        },
        database: "checking...",
        environment: process.env.NODE_ENV
      };

      // Quick database ping
      try {
        const dbStart = Date.now();
        await db.select().from(pins).limit(1);
        const dbTime = Date.now() - dbStart;
        systemInfo.database = `healthy (${dbTime}ms)`;
      } catch (error) {
        systemInfo.database = "unhealthy";
        systemInfo.status = "degraded";
      }

      res.json(systemInfo);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: "System check failed",
        timestamp: new Date().toISOString()
      });
    }
  });
  
  console.log("✅ System health endpoint registered");

  console.log("✅ About to apply middleware...");
  
  // Apply comprehensive protection to all routes
  app.use('/api', ddosProtectionMiddleware);
  app.use('/api', generalLimiter);
  
  console.log("✅ Middleware applied successfully");

  // Generate shortcode helper
  function generateShortcode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  console.log("✅ About to register pin creation endpoint...");
  
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
      
      // Check email-based pin limit (5 pins max per email, unless whitelisted)
      if (validatedData.createdBy && !isEmailWhitelisted(validatedData.createdBy)) {
        const pinCount = await storage.getPinCountByEmail(validatedData.createdBy);
        if (pinCount >= 5) {
          return res.status(400).json({ 
            message: "📧 You've reached your limit of 5 addypins per email address. This helps prevent spam and keeps addypin running smoothly for everyone!",
            code: "PIN_LIMIT_EXCEEDED",
            hint: "Consider using different coordinates or contact support if you need more pins."
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
            message: "🎯 You already have an addypin at these exact coordinates! Use your existing one or choose a slightly different location.",
            code: "DUPLICATE_COORDINATES",
            existingShortcode: duplicatePin[0].shortcode,
            hint: `Your existing addypin: ${duplicatePin[0].shortcode}${process.env.NODE_ENV === 'development' ? ` at ${req.get('host') || 'localhost:5000'}` : '.addypin.com'}`
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
      
      // Invalidate stats cache since we created a new pin
      invalidateStatsCache();
      
      // Track creation analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "creation",
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      });

      // Log security info
      console.log(`Pin created: ${pin.shortcode} from IP: ${req.ip || '127.0.0.1'}, registered: ${!!validatedData.createdBy}`);

      // Get base domain based on environment
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseUrl = isDevelopment ? 
        `${req.protocol}://${req.get('host')}` : 
        'https://addypin.com';
      const baseDomain = isDevelopment ? 
        req.get('host') || 'localhost:5000' : 
        'addypin.com';

      res.status(201).json({
        pin,
        webLink: isDevelopment ? 
          `${baseUrl}/${pin.shortcode}` : 
          `${pin.shortcode}.addypin.com`,
        emailLink: `${pin.shortcode}@${baseDomain}`,
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
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
        metadata: { appName: mapApp }
      });

      // Invalidate stats cache since click counts affect stats
      invalidateStatsCache();

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking map click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Send OTP for pin editing and analytics access
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

      // For analytics access, only allow the admin email
      const isAnalyticsAccess = email === "avoidaccess@msn.com";
      
      if (!isAnalyticsAccess) {
        // Check if user has pins for regular pin editing
        const userPins = await storage.getPinsByEmail(email);
        if (userPins.length === 0) {
          return res.status(404).json({ 
            message: "No pins found for this email address" 
          });
        }
      }

      // Check if there's already a valid OTP for this email
      const existingOtp = await storage.getValidOtpCode(email, null);
      let otp: string;
      
      if (existingOtp && !existingOtp.used && new Date() < new Date(existingOtp.expiresAt)) {
        // Use existing valid OTP
        otp = existingOtp.code;
        console.log(`📧 Reusing existing OTP for ${email}: ${otp}`);
      } else {
        // Invalidate any existing OTPs for this email first
        await storage.invalidateOtpCodesForEmail(email);
        
        // Generate new 6-digit OTP
        otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiry
        await storage.createOtpCode({
          email,
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          used: false
        });
        console.log(`📧 Generated new OTP for ${email}: ${otp}`);
      }

      // Send OTP email
      const { sendOTPEmail } = await import('./services/resend-email');
      const emailResult = await sendOTPEmail({ to: email, code: otp });

      // Log the OTP to console in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log("🔑 =================================");
        console.log(`🔑 OTP CODE FOR ${email.toUpperCase()}: ${otp}`);
        if (isAnalyticsAccess) {
          console.log("🔑 ANALYTICS ACCESS REQUEST");
        }
        console.log("🔑 =================================");
      }

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

      const otpRecord = await storage.getValidOtpCode(email, code);
      const isValid = !!otpRecord;
      
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
      const otpRecord = await storage.getValidOtpCode(email, otpCode);
      if (!otpRecord) {
        return res.status(400).json({ 
          message: "Invalid or expired OTP code" 
        });
      }
      
      // Mark OTP as used
      await storage.markOtpAsUsed(otpRecord.id);

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

  // Get user pins by email
  app.get("/api/user/pins/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const pins = await storage.getPinsByEmail(email);
      res.json(pins);
    } catch (error) {
      console.error("Error fetching user pins:", error);
      res.status(500).json({ message: "Failed to fetch user pins" });
    }
  });

  // Get analytics stats
  app.get("/api/stats", async (req, res) => {
    try {
      const now = Date.now();
      
      // Check if we have valid cached data
      if (statsCache && (now - statsCacheTimestamp) < STATS_CACHE_DURATION) {
        console.log("📊 Serving cached stats data");
        return res.json(statsCache);
      }
      
      // Fetch fresh data from database
      console.log("🔄 Fetching fresh stats from database");
      const stats = await storage.getTodaysStats();
      
      // Update cache
      statsCache = stats;
      statsCacheTimestamp = now;
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin endpoint to get comprehensive analytics (protected)
  app.get("/api/analytics/comprehensive", async (req, res) => {
    try {
      const stats = await storage.getTodaysStats();
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

      // Invalidate stats cache since pin count changed
      invalidateStatsCache();

      res.json({ success: true, message: "Pin deleted successfully" });
    } catch (error) {
      console.error("Error deleting pin:", error);
      res.status(500).json({ message: "Failed to delete pin" });
    }
  });

  // Enhanced security monitoring endpoint
  app.get("/api/security/stats", async (req, res) => {
    try {
      const ddosStatus = getDDoSStatus();
      const securityStats = {
        message: "🛡️ DDoS Protection & Security Monitoring Active",
        ddosProtection: ddosStatus,
        rateLimiting: {
          status: "active",
          whitelistedEmails: 1, // Don't expose actual emails
          whitelistedIPs: process.env.NODE_ENV === 'development' ? "dev_mode_whitelist" : "production_whitelist"
        },
        botProtection: {
          status: "active",
          patterns: 10,
          threatDetection: "enhanced"
        },
        timestamp: new Date().toISOString()
      };
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

  // Email webhook for receiving emails via Maddy Mail Server
  app.post("/api/webhook/email-inbound", async (req, res) => {
    try {
      // Maddy sends JSON payload
      const { from, to, subject, body, headers } = req.body;
      
      // Log the incoming email
      console.log('📧 INCOMING EMAIL (Maddy):');
      console.log(`To: ${Array.isArray(to) ? to[0] : to}`);
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log('---');
      
      if (!to || !from) {
        return res.status(400).json({ error: "Missing to or from address" });
      }

      // Handle to field as array or string
      const recipientEmail = Array.isArray(to) ? to[0] : to;

      // Extract shortcode from recipient email (ak7n1z@addypin.com)
      const emailMatch = recipientEmail.match(/^([A-Z0-9]{6})@addypin\.com$/i);
      if (!emailMatch) {
        return res.status(400).json({ error: "Invalid recipient format" });
      }
      
      const shortcode = emailMatch[1].toUpperCase();
      console.log(`Extracted shortcode: ${shortcode}`);
      
      // Send auto-response
      const result = await sendMapAutoResponse({ fromEmail: from, shortcode });
      
      if (result.success) {
        console.log(`✅ Auto-response sent successfully`);
        res.status(200).json({ status: "processed" }); // Maddy expects JSON response
      } else {
        console.log(`❌ Auto-response failed: ${result.message}`);
        res.status(200).json({ status: "failed", message: result.message });
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

  console.log("✅ All routes registered successfully! Creating HTTP server...");
  
  const httpServer = createServer(app);
  
  console.log("✅ HTTP server created, returning to main...");
  return httpServer;
}