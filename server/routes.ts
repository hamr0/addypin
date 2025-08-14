import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPinSchema, insertAnalyticsSchema } from "@shared/schema";
import { z } from "zod";
import { emailService } from "./services/email";
import { analyticsService } from "./services/analytics";

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

  // Create new pin
  app.post("/api/pins", async (req, res) => {
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

  // Send location via email
  app.post("/api/send-location", async (req, res) => {
    try {
      const { email, latitude, longitude, shortcode } = z.object({
        email: z.string().email(),
        latitude: z.string(),
        longitude: z.string(),
        shortcode: z.string().optional(),
      }).parse(req.body);

      const success = await emailService.sendLocationEmail(email, {
        latitude,
        longitude,
        shortcode,
      });

      if (success && shortcode) {
        // Track email sent analytics
        const pin = await storage.getPinByShortcode(shortcode);
        if (pin) {
          await analyticsService.trackEvent({
            pinId: pin.id,
            eventType: "email_sent",
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            metadata: { recipientEmail: email },
          });
        }
      }

      if (success) {
        res.json({ message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Send email error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid email data" });
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

  // Subdomain redirect handling (this would typically be handled by nginx or similar)
  app.get("/redirect/:shortcode", async (req, res) => {
    try {
      const { shortcode } = req.params;
      const pin = await storage.getPinByShortcode(shortcode);

      if (!pin) {
        return res.status(404).send("Pin not found");
      }

      // Track click analytics
      await analyticsService.trackEvent({
        pinId: pin.id,
        eventType: "click",
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      // Redirect to appropriate map based on user agent
      const userAgent = req.headers['user-agent']?.toLowerCase() || '';
      let redirectUrl: string;

      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        redirectUrl = `https://maps.apple.com/?ll=${pin.latitude},${pin.longitude}`;
      } else if (userAgent.includes('android')) {
        redirectUrl = `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
      } else {
        redirectUrl = `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
      }

      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      res.status(500).send("Server error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
