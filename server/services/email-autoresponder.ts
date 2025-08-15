import { Resend } from 'resend';
import { storage } from '../storage';

const resend = new Resend(process.env.RESEND_API_KEY);

interface AutoResponseParams {
  fromEmail: string;
  shortcode: string;
}

export async function sendMapAutoResponse({ fromEmail, shortcode }: AutoResponseParams): Promise<{ success: boolean; message: string }> {
  try {
    // Check if RESEND_API_KEY is available
    if (!process.env.RESEND_API_KEY) {
      console.log(`\n📧 ===============================`);
      console.log(`📧 EMAIL AUTO-RESPONDER - DEVELOPMENT MODE`);
      console.log(`📧 From: ${fromEmail}`);
      console.log(`📧 Shortcode: ${shortcode}`);
      console.log(`📧 Would send: Map links and 13 cross-app options`);
      console.log(`📧 ===============================\n`);
      return { 
        success: true, 
        message: "Development mode: Auto-response logged to console" 
      };
    }

    // Get pin details
    const pin = await storage.getPinByShortcode(shortcode);
    
    if (!pin) {
      return { 
        success: false, 
        message: "Pin not found" 
      };
    }

    // Generate map app links
    const mapLinks = {
      "Google Maps": `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`,
      "Apple Maps": `https://maps.apple.com/?q=${pin.latitude},${pin.longitude}`,
      "Waze": `https://waze.com/ul?q=${pin.latitude}%2C${pin.longitude}&navigate=yes`,
      "HERE WeGo": `https://wego.here.com/directions/mix//${pin.latitude},${pin.longitude}`,
      "MapQuest": `https://www.mapquest.com/directions/to/us/${pin.latitude},${pin.longitude}`,
      "Maps.me": `https://maps.me/map/${pin.latitude},${pin.longitude}`,
      "OpenStreetMap": `https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=16/${pin.latitude}/${pin.longitude}`,
      "Bing Maps": `https://www.bing.com/maps?q=${pin.latitude},${pin.longitude}`,
      "TomTom": `https://www.tomtom.com/en_us/maps/map?lat=${pin.latitude}&lng=${pin.longitude}`,
      "Citymapper": `https://citymapper.com/directions?endcoord=${pin.latitude}%2C${pin.longitude}`,
      "OsmAnd": `https://osmand.net/map#16/${pin.latitude}/${pin.longitude}`,
      "Sygic Maps": `https://www.sygic.com/en/gps-navigation-maps/sygic-maps`,
      "Badger Maps": `https://www.badgermapping.com/`
    };

    // Create HTML email with map links
    const mapLinksHtml = Object.entries(mapLinks).map(([name, url]) => `
      <div style="margin: 8px 0;">
        <a href="${url}" 
           style="display: inline-block; background: #00BCD4; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 4px;"
           target="_blank">
          ${name}
        </a>
      </div>
    `).join('');

    const { data, error } = await resend.emails.send({
      from: 'addypin <noreply@addypin.com>',
      to: [fromEmail],
      subject: `Your addypin Location - ${shortcode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your addypin Location</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
              }
              .content {
                padding: 30px 20px;
              }
              .coordinates {
                background: #f1f3f4;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
                font-family: monospace;
                font-size: 16px;
                color: #1f2937;
              }
              .map-links {
                margin: 20px 0;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
              }
              .addypin-logo {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 8px;
              }
              .logo-text {
                font-size: 24px;
                font-weight: 700;
                color: white;
                letter-spacing: -0.025em;
              }
              .logo-pin {
                display: inline-block;
                width: 16px;
                height: 16px;
                background: #00BCD4;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                position: relative;
                margin: 0 3px;
                border: 2px solid white;
                box-shadow: 0 1px 4px rgba(0, 188, 212, 0.3);
              }
              .logo-pin::after {
                content: '';
                position: absolute;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                top: 3px;
                left: 3px;
                transform: rotate(45deg);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="addypin-logo">
                  <span class="logo-text">addy</span>
                  <div class="logo-pin"></div>
                  <span class="logo-text">in</span>
                </div>
                <p>Location sharing made simple</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0; color: #1f2937;">Your Location: ${shortcode}</h2>
                <p>Here are your coordinates and map options:</p>
                
                <div class="coordinates">
                  ${pin.latitude}, ${pin.longitude}
                </div>
                
                <h3>Open in Your Favorite Map App:</h3>
                <div class="map-links">
                  ${mapLinksHtml}
                </div>
                
                <p style="color: #6b7280; margin-top: 30px;">
                  You can also visit: <strong>addypin.com/${shortcode}</strong>
                </p>
              </div>
              <div class="footer">
                <p>© 2025 addypin - Secure location sharing</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        addypin - Your Location: ${shortcode}
        
        Coordinates: ${pin.latitude}, ${pin.longitude}
        
        Open in your favorite map app:
        ${Object.entries(mapLinks).map(([name, url]) => `${name}: ${url}`).join('\n')}
        
        You can also visit: addypin.com/${shortcode}
        
        © 2025 addypin - Secure location sharing
      `
    });

    if (error) {
      console.error('Auto-response email error:', error);
      return { 
        success: false, 
        message: "Failed to send auto-response" 
      };
    }

    console.log('✅ Auto-response email sent:', data?.id);
    return { 
      success: true, 
      message: "Location details sent to your email" 
    };

  } catch (error) {
    console.error('Email auto-responder error:', error);
    return { 
      success: false, 
      message: "Failed to send location details" 
    };
  }
}