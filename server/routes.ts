import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertPinSchema, insertAnalyticsSchema } from "@shared/schema";
import { z } from "zod";
import { analyticsService } from "./services/analytics";
import { emailService } from "./services/email";
import { requireAuth } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate shortcode helper
  function generateShortcode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create new pin (requires authentication)
  app.post("/api/pins", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPinSchema.parse(req.body);
      
      // Generate unique shortcode
      let shortcode: string;
      let existingPin;
      do {
        shortcode = generateShortcode();
        existingPin = await storage.getPinByShortcode(shortcode);
      } while (existingPin);

      const pin = await storage.createPin({
        ...validatedData,
        shortcode,
        userId: req.userId!,
        createdBy: req.userEmail || undefined,
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

  // Get pin by shortcode (for redirects)
  app.get("/api/pins/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);

      if (!pin) {
        return res.status(404).json({ message: "Pin not found" });
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

  // Send OTP for coordinate editing
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      const result = await emailService.sendOtpCode(email);
      
      if (result.success) {
        res.json({ message: result.message });
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
      
      const result = await emailService.verifyOtpCode(email, code);
      
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
        userAgent: req.headers['user-agent'],
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
