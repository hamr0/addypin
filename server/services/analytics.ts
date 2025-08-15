import { storage } from "../storage";
import { type InsertAnalytics } from "@shared/schema";

// Simple IP geolocation (in production, use MaxMind GeoLite2 or similar)
const getCountryFromIP = (ip: string): string | null => {
  // For development/testing purposes, return some sample countries based on IP patterns
  // In production, use proper geolocation service like MaxMind
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'Local'; // Local development
  }
  
  // Sample mapping for demonstration (replace with real geolocation service)
  const lastOctet = parseInt(ip.split('.').pop() || '0');
  const countries = ['Netherlands', 'United States', 'Germany', 'France', 'United Kingdom', 'Canada', 'Australia'];
  return countries[lastOctet % countries.length];
};

const parseUserAgent = (userAgent: string | undefined): { browser: string | null; os: string | null } => {
  if (!userAgent) return { browser: null, os: null };

  let browser = null;
  let os = null;

  // Simple browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Simple OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return { browser, os };
};

interface TrackEventParams {
  pinId: string;
  eventType: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
  sessionId?: string; // For tracking unique daily users
}

class AnalyticsService {
  async trackEvent(params: TrackEventParams): Promise<void> {
    try {
      const { browser, os } = parseUserAgent(params.userAgent);
      const country = params.ipAddress ? getCountryFromIP(params.ipAddress) : null;

      await storage.createAnalyticsEvent({
        pinId: params.pinId,
        eventType: params.eventType,
        userAgent: params.userAgent || null,
        ipAddress: params.ipAddress || null,
        country,
        browser,
        os,
        metadata: params.metadata || null,
        sessionId: params.sessionId || null,
      });

      // Update daily stats
      await this.updateDailyStats();
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  private async updateDailyStats(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await storage.getTodaysStats();
      
      await storage.updateDailyStats(today, {
        date: today,
        pinsCreated: stats.pinsCreated,
        linksClicked: stats.linksClicked,
        emailsSent: stats.emailsSent,
        uniqueCountries: stats.activeCountries,
      });
    } catch (error) {
      console.error("Daily stats update error:", error);
    }
  }

  async sendDailyReport(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = await storage.getTodaysStats();
      
      // Get total stats (this is simplified - in production you'd want more comprehensive totals)
      const totalStats = await storage.getDailyStatsForPeriod('2024-01-01', today);
      const totals = totalStats.reduce((acc, stat) => ({
        pinsCreated: acc.pinsCreated + stat.pinsCreated,
        linksClicked: acc.linksClicked + stat.linksClicked,
        emailsSent: acc.emailsSent + stat.emailsSent,
        uniqueCountries: Math.max(acc.uniqueCountries, stat.uniqueCountries),
      }), { pinsCreated: 0, linksClicked: 0, emailsSent: 0, uniqueCountries: 0 });

      console.log("Daily analytics report:", {
        daily: dailyStats,
        total: totals,
      });
    } catch (error) {
      console.error("Daily report error:", error);
    }
  }
}

export const analyticsService = new AnalyticsService();

// Schedule daily reports (in production, use a proper cron job or task scheduler)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    const now = new Date();
    // Send report at midnight UTC
    if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
      await analyticsService.sendDailyReport();
    }
  }, 300000); // Check every 5 minutes (much more reasonable)
}
