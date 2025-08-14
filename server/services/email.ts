import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use App Password for Gmail
      },
    });
  }
  
  // Fallback to Ethereal Email (test service) for development
  return null;
};

interface LocationEmailData {
  latitude: string;
  longitude: string;
  shortcode?: string;
}

class EmailService {
  async sendLocationEmail(to: string, locationData: LocationEmailData): Promise<boolean> {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn("Email credentials not configured, email not sent");
      console.warn("To enable email: Set EMAIL_USER (Gmail address) and EMAIL_PASS (App Password)");
      return false;
    }

    try {
      const { latitude, longitude, shortcode } = locationData;
      
      const mapLinks = {
        "Google Maps": `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
        "Apple Maps": `https://maps.apple.com/?ll=${latitude},${longitude}`,
        "Waze": `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
        "HERE WeGo": `https://share.here.com/l/${latitude},${longitude}`,
        "MapQuest": `https://www.mapquest.com/latlng/${latitude},${longitude}`,
        "Maps.me": `https://maps.me/?map=${latitude},${longitude},18`,
        "OpenStreetMap": `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`,
        "Bing Maps": `https://www.bing.com/maps?cp=${latitude}~${longitude}&lvl=18`,
        "TomTom": `https://mydrive.tomtom.com/en_gb/#mode=search+viewport=${latitude},${longitude},18,0,-0+search=${latitude},${longitude}`,
        "Citymapper": `https://citymapper.com/directions?endcoord=${latitude}%2C${longitude}`,
        "OsmAnd": `https://osmand.net/go?lat=${latitude}&lon=${longitude}&z=18`,
        "Sygic Maps": `https://directions.sygic.com/?location=${latitude}%2C${longitude}`,
        "Badger Maps": `https://web.badgermapping.com/map?lat=${latitude}&lng=${longitude}`,
      };

      const linksHtml = Object.entries(mapLinks)
        .map(([name, url]) => `<li><a href="${url}" style="color: #00BCD4; text-decoration: none;">${name}</a></li>`)
        .join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your AddyPin Location</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #374151; margin: 0;">addy<span style="color: #00BCD4;">📍</span>in</h1>
            <p style="color: #6B7280; margin: 5px 0 0 0;">Your location coordinates</p>
          </div>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #374151; margin-top: 0;">Location Details</h2>
            <p><strong>Latitude:</strong> ${latitude}</p>
            <p><strong>Longitude:</strong> ${longitude}</p>
            ${shortcode ? `<p><strong>Short Link:</strong> <a href="https://${shortcode}.addypin.com" style="color: #00BCD4;">${shortcode}.addypin.com</a></p>` : ''}
            ${shortcode ? `<p><strong>Email Format:</strong> <a href="mailto:${shortcode}@addypin.com" style="color: #00BCD4;">${shortcode}@addypin.com</a></p>` : ''}
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #374151;">Open in Map Apps (${Object.keys(mapLinks).length} apps):</h3>
            <ul style="padding-left: 20px;">
              ${linksHtml}
            </ul>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
            <p>Sent from <a href="https://addypin.com" style="color: #00BCD4; text-decoration: none;">AddyPin.com</a> - The simplest way to share locations</p>
          </div>
        </body>
        </html>
      `;

      const text = `
Your AddyPin Location

Location Details:
Latitude: ${latitude}
Longitude: ${longitude}
${shortcode ? `Short Link: https://${shortcode}.addypin.com` : ''}
${shortcode ? `Email Format: ${shortcode}@addypin.com` : ''}

Open in Map Apps (${Object.keys(mapLinks).length} apps):
${Object.entries(mapLinks).map(([name, url]) => `${name}: ${url}`).join('\n')}

Sent from AddyPin.com - The simplest way to share locations
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@addypin.com',
        to,
        subject: `Your AddyPin Location${shortcode ? ` (${shortcode})` : ''}`,
        text,
        html,
      });

      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  async sendDailyAnalytics(stats: any): Promise<boolean> {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn("Email credentials not configured, analytics email not sent");
      return false;
    }

    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AddyPin Daily Analytics</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #374151; margin: 0;">addy<span style="color: #00BCD4;">📍</span>in</h1>
            <p style="color: #6B7280; margin: 5px 0 0 0;">Daily Analytics Report - ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #374151; margin-top: 0;">Today's Stats</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div>
                <p style="margin: 0; font-weight: bold; color: #00BCD4;">Pins Created</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.daily.pinsCreated}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #00BCD4;">Links Clicked</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.daily.linksClicked}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #00BCD4;">Emails Sent</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.daily.emailsSent}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #00BCD4;">Active Countries</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.daily.uniqueCountries}</p>
              </div>
            </div>
          </div>

          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #374151; margin-top: 0;">Total Stats</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div>
                <p style="margin: 0; font-weight: bold; color: #6B7280;">Total Pins</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.total.pinsCreated}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #6B7280;">Total Clicks</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.total.linksClicked}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #6B7280;">Total Emails</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.total.emailsSent}</p>
              </div>
              <div>
                <p style="margin: 0; font-weight: bold; color: #6B7280;">All Countries</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold;">${stats.total.uniqueCountries}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@addypin.com',
        to: 'avoidaccess@msn.com',
        subject: `AddyPin Daily Analytics - ${new Date().toLocaleDateString()}`,
        html,
      });

      return true;
    } catch (error) {
      console.error('Analytics email sending error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
