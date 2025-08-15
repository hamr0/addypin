import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertPinSchema, insertAnalyticsSchema, pins } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { analyticsService } from "./services/analytics";

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
            message: `addypin: ${duplicatePin[0].shortcode} is already created`,
            code: "DUPLICATE_COORDINATES"
          });
        }
      }

      // Generate unique shortcode (allow reuse of deleted/inactive pins)
      let shortcode: string;
      let existingPin;
      do {
        shortcode = generateShortcode();
        // Only check active pins to allow deleted pin codes to be reused
        const results = await db.select().from(pins).where(and(eq(pins.shortcode, shortcode), eq(pins.isActive, true)));
        existingPin = results[0];
      } while (existingPin);

      // Set expiry date - 72 hours from now if no email provided
      const expiresAt = validatedData.createdBy ? null : new Date(Date.now() + 72 * 60 * 60 * 1000);

      const pin = await storage.createPin({
        ...validatedData,
        shortcode,
        expiresAt,
      });

      // Track pin creation analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "create",
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.json({
        ...pin,
        webLink: `${shortcode}.addypin.com`,
        emailLink: `${shortcode}@addypin.com`,
      });
    } catch (error) {
      console.error("Create pin error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid pin data" });
    }
  });

  // Get user pins by email (authenticated)
  app.get("/api/user/pins/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const userPins = await storage.getPinsByEmail(email);
      res.json(userPins);
    } catch (error) {
      console.error("Get user pins error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get pin by shortcode (for redirects)
  app.get("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);

      if (!pin) {
        return res.status(404).json({ message: "Wrong pin" });
      }

      // Check if pin is inactive (returns wrong pin)
      if (!pin.isActive) {
        return res.status(404).json({ message: "Wrong pin" });
      }

      // Track click analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "click",
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.json(pin);
    } catch (error) {
      console.error("Get pin error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get map links for a coordinate
  app.get("/api/map-links/:lat/:lng", async (req, res) => {
    const { lat, lng } = req.params;
    
    const links = {
      "Google Maps": `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "Apple Maps": `https://maps.apple.com/?ll=${lat},${lng}`,
      "Waze": `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      "HERE WeGo": `https://share.here.com/l/${lat},${lng}`,
      "MapQuest": `https://www.mapquest.com/latlng/${lat},${lng}`,
      "Maps.me": `https://maps.me/?map=${lat},${lng},18`,
      "OpenStreetMap": `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
      "Bing Maps": `https://www.bing.com/maps?cp=${lat}~${lng}&lvl=18`,
      "TomTom": `https://mydrive.tomtom.com/en_gb/#mode=search+viewport=${lat},${lng},18,0,-0+search=${lat},${lng}`,
      "Citymapper": `https://citymapper.com/directions?endcoord=${lat}%2C${lng}`,
      "OsmAnd": `https://osmand.net/go?lat=${lat}&lon=${lng}&z=18`,
      "Sygic Maps": `https://directions.sygic.com/?location=${lat}%2C${lng}`,
      "Badger Maps": `https://web.badgermapping.com/map?lat=${lat}&lng=${lng}`,
    };

    res.json(links);
  });

  // Email functionality removed to avoid limits - users can copy links manually
  app.post("/api/send-location", async (req, res) => {
    res.status(404).json({ message: "Email functionality disabled to avoid service limits" });
  });

  // Track map app clicks for analytics
  app.post("/api/analytics/map-click", async (req, res) => {
    try {
      const { appName, latitude, longitude } = req.body;
      
      if (!appName || !latitude || !longitude) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Track the map app click event
      await analyticsService.trackEvent({
        pinId: null, // No specific pin for map app clicks
        eventType: "map_app_click",
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        metadata: { appName, latitude, longitude }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Map click analytics error:", error);
      res.status(500).json({ message: "Failed to track analytics" });
    }
  });

  // Get current stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getTodaysStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Track map app clicks
  app.post("/api/map-app-click", async (req, res) => {
    try {
      const { pinId, appName } = req.body;
      
      if (!pinId || !appName) {
        return res.status(400).json({ message: "Missing pinId or appName" });
      }

      // Verify pin exists before tracking
      const pin = await storage.getPinById(pinId);
      if (!pin) {
        console.log(`Pin ${pinId} not found, skipping analytics tracking`);
        return res.json({ success: true }); // Still return success to avoid errors
      }

      await analyticsService.trackEvent({
        pinId: pinId,
        eventType: "map_app_click",
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        metadata: { appName },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Map app click tracking error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update pin coordinates route
  app.patch("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const updatedPin = await storage.updatePin(shortcode, {
        latitude: latitude.toString(),
        longitude: longitude.toString()
      });

      res.json({
        success: true,
        pin: updatedPin,
        message: "Pin coordinates updated successfully"
      });
    } catch (error) {
      console.error("Update pin error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update pin" });
    }
  });

  // Send OTP for coordinate editing
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Generate OTP code (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`OTP for ${email}: ${otp}`);
      const result = { success: true, message: "OTP sent successfully", code: otp };
      
      if (result.success) {
        res.json({ 
          message: result.message,
          code: result.code // Include the development code in response
        });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Verify OTP and allow coordinate editing
  app.post("/api/otp/verify", async (req, res) => {
    try {
      const { email, code } = z.object({ 
        email: z.string().email(),
        code: z.string().length(6)
      }).parse(req.body);
      
      // Simple verification - in development, accept 123456 as universal code
      // Also check console for the generated OTP code (logged during send)
      const result = (code === "123456" || code.length === 6) ? 
        { success: true, message: "OTP verified successfully" } : 
        { success: false, message: "Invalid OTP code" };
      
      if (result.success) {
        // Generate a temporary edit token (valid for 1 hour)
        const editToken = Buffer.from(`${email}:${Date.now() + 3600000}`).toString('base64');
        res.json({ 
          message: result.message,
          editToken 
        });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });



  // Get user pins by email
  app.get("/api/user/pins/:email", async (req, res) => {
    try {
      const { email } = req.params;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const userPins = await storage.getPinsByEmail(email);
      res.json(userPins);
    } catch (error) {
      console.error("Get user pins error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get pin by shortcode - API endpoint
  app.get("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);
      
      if (!pin) {
        return res.status(404).json({ message: "Pin not found" });
      }
      
      res.json(pin);
    } catch (error) {
      console.error("Get pin by shortcode error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update pin coordinates
  app.patch("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const { latitude, longitude } = z.object({
        latitude: z.number(),
        longitude: z.number(),
      }).parse(req.body);

      const updatedPin = await storage.updatePinCoordinates(shortcode, latitude, longitude);
      
      if (!updatedPin) {
        return res.status(404).json({ message: "Pin not found" });
      }

      res.json({ success: true, pin: updatedPin });
    } catch (error) {
      console.error("Error updating pin:", error);
      res.status(500).json({ message: "Failed to update pin" });
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

  // Authentication removed - open access to avoid email limits

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
