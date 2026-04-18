import { Resend } from 'resend';
import { storage } from '../storage';
import { getCountryFromCoords } from '../../shared/utils';

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
      // Send helpful response for invalid/expired pins
      const { data, error } = await resend.emails.send({
        from: 'addypin <noreply@addypin.com>',
        to: [fromEmail],
        subject: `${shortcode} - addypin not found`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>addypin Not Found</title>
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
                  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                  color: white;
                  padding: 30px 20px;
                  text-align: center;
                }
                .content {
                  padding: 30px 20px;
                }
                .footer {
                  background: #f8f9fa;
                  padding: 20px;
                  text-align: center;
                  color: #6b7280;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 48px;">📍❌</h1>
                  <h2 style="margin: 10px 0 0 0;">addypin Not Found</h2>
                </div>
                <div class="content">
                  <p>The addypin <strong>${shortcode}</strong> doesn't exist or may have expired.</p>

                  <h3>Possible reasons:</h3>
                  <ul>
                    <li>The addypin was deleted by its creator</li>
                    <li>It expired after 72 hours (pins without email addresses expire automatically)</li>
                    <li>The shortcode was mistyped</li>
                  </ul>

                  <p style="margin-top: 30px;">
                    <strong>Want to create your own addypin?</strong><br>
                    Visit <a href="https://addypin.com" style="color: #667eea;">addypin.com</a> to share locations simply.
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
          addypin Not Found - ${shortcode}

          The addypin ${shortcode} doesn't exist or may have expired.

          Possible reasons:
          - The addypin was deleted by its creator
          - It expired after 72 hours (pins without email addresses expire automatically)
          - The shortcode was mistyped

          Want to create your own addypin?
          Visit addypin.com to share locations simply.

          © 2025 addypin - Secure location sharing
        `
      });

      if (error) {
        console.error('Error sending not-found email:', error);
        return {
          success: false,
          message: "Pin not found and failed to send notification email"
        };
      }

      console.log('Not-found notification email sent:', data?.id);
      return {
        success: true,
        message: "Pin not found - notification email sent"
      };
    }

    // Get country name from coordinates
    const country = getCountryFromCoords(parseFloat(pin.latitude.toString()), parseFloat(pin.longitude.toString()));

    // Generate map app links with icons
    const mapLinks = {
      "🗺️ Google Maps": `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`,
      "🍎 Apple Maps": `https://maps.apple.com/?q=${pin.latitude},${pin.longitude}`,
      "🚗 Waze": `https://waze.com/ul?q=${pin.latitude}%2C${pin.longitude}&navigate=yes`,
      "🧭 HERE WeGo": `https://wego.here.com/directions/mix//${pin.latitude},${pin.longitude}`,
      "🗺️ MapQuest": `https://www.mapquest.com/directions/to/us/${pin.latitude},${pin.longitude}`,
      "📱 Maps.me": `https://maps.me/map/${pin.latitude},${pin.longitude}`,
      "🌍 OpenStreetMap": `https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=16/${pin.latitude}/${pin.longitude}`,
      "🔍 Bing Maps": `https://www.bing.com/maps?q=${pin.latitude},${pin.longitude}`,
      "🚗 TomTom": `https://www.tomtom.com/en_us/maps/map?lat=${pin.latitude}&lng=${pin.longitude}`,
      "🚇 Citymapper": `https://citymapper.com/directions?endcoord=${pin.latitude}%2C${pin.longitude}`,
      "🗺️ OsmAnd": `https://osmand.net/map#16/${pin.latitude}/${pin.longitude}`,
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
      subject: `${shortcode} - ${country}`,
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
              .logo-pin {
                display: inline-block;
                width: 24px;
                height: 30px;
                background: #4A90E2;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                position: relative;
                margin-right: 8px;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
              }
              .logo-pin::after {
                content: '✓';
                position: absolute;
                color: white;
                font-size: 12px;
                font-weight: bold;
                top: 2px;
                left: 2px;
                transform: rotate(45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
              }
              .logo-text {
                font-family: 'Corben', serif;
                font-size: 24px;
                font-weight: 700;
                color: white;
                letter-spacing: -0.025em;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="addypin-logo">
                  <div class="logo-pin"></div>
                  <span class="logo-text">addypin</span>
                </div>
                <p>Location sharing made simple</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0; color: #1f2937;">${shortcode} - ${country}</h2>
                
                <h3>Open in Map Apps:</h3>
                <div class="map-links">
                  ${mapLinksHtml}
                </div>
                
                <p style="color: #6b7280; margin-top: 30px;">
                  You can also visit: <strong>${shortcode}.addypin.com</strong>
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
        addypin - ${shortcode} - ${country}
        
        Open in Map Apps:
        ${Object.entries(mapLinks).map(([name, url]) => `${name}: ${url}`).join('\n')}
        
        You can also visit: ${shortcode}.addypin.com
        
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

    console.log('Auto-response email sent:', data?.id);
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