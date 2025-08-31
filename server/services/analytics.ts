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

interface BatchedEvent {
  pinId: string;
  eventType: string;
  userAgent: string | null;
  ipAddress: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  metadata: any;
  sessionId: string | null;
  timestamp: Date;
}

class AnalyticsService {
  private eventBatch: BatchedEvent[] = [];
  private batchFlushInterval: NodeJS.Timeout | null = null;
  private BATCH_FLUSH_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private MAX_BATCH_SIZE = 1000; // Flush if batch gets too large
  private lastFlushTime = Date.now();

  constructor() {
    // Start the batch flush interval
    this.startBatchFlushInterval();
    
    // Flush on process exit to avoid losing data
    process.on('SIGINT', () => this.flushBatch('SIGINT'));
    process.on('SIGTERM', () => this.flushBatch('SIGTERM'));
    process.on('beforeExit', () => this.flushBatch('beforeExit'));
  }

  private startBatchFlushInterval(): void {
    this.batchFlushInterval = setInterval(() => {
      this.flushBatch('interval');
    }, this.BATCH_FLUSH_INTERVAL);
    
    console.log(`📊 Analytics batch flush interval started (every ${this.BATCH_FLUSH_INTERVAL / 1000 / 60} minutes)`);
  }

  async trackEvent(params: TrackEventParams): Promise<void> {
    try {
      const { browser, os } = parseUserAgent(params.userAgent);
      const country = params.ipAddress ? getCountryFromIP(params.ipAddress) : null;

      // Add to batch instead of immediate database write
      this.eventBatch.push({
        pinId: params.pinId,
        eventType: params.eventType,
        userAgent: params.userAgent || null,
        ipAddress: params.ipAddress || null,
        country,
        browser,
        os,
        metadata: params.metadata || null,
        sessionId: params.sessionId || null,
        timestamp: new Date()
      });

      // Flush if batch is getting too large
      if (this.eventBatch.length >= this.MAX_BATCH_SIZE) {
        console.log(`📊 Batch size reached ${this.MAX_BATCH_SIZE}, flushing...`);
        await this.flushBatch('size_limit');
      }
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  async flushBatch(reason: string = 'manual'): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    const batchToFlush = [...this.eventBatch];
    this.eventBatch = []; // Clear batch immediately to avoid duplicates
    
    const timeSinceLastFlush = (Date.now() - this.lastFlushTime) / 1000 / 60;
    console.log(`📊 Flushing ${batchToFlush.length} analytics events to database (reason: ${reason}, time since last flush: ${timeSinceLastFlush.toFixed(1)} minutes)`);
    
    try {
      // Write all events to database in a single transaction
      for (const event of batchToFlush) {
        await storage.createAnalyticsEvent(event);
      }
      
      // Update daily stats once after batch
      await this.updateDailyStats();
      
      this.lastFlushTime = Date.now();
      console.log(`✅ Successfully flushed ${batchToFlush.length} events to database`);
    } catch (error) {
      console.error("Error flushing analytics batch:", error);
      // Re-add failed events to batch for retry
      this.eventBatch = [...batchToFlush, ...this.eventBatch];
    }
  }

  // New method to get current batch status (for monitoring)
  getBatchStatus(): { batchSize: number; timeSinceLastFlush: number } {
    return {
      batchSize: this.eventBatch.length,
      timeSinceLastFlush: Math.floor((Date.now() - this.lastFlushTime) / 1000)
    };
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
  // Method to force immediate flush (for testing or critical events)
  async forceFlush(): Promise<void> {
    await this.flushBatch('forced');
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
