interface SecurityEvent {
  type: 'rate_limit' | 'bot_detected' | 'suspicious_activity' | 'blocked_request';
  ip: string;
  userAgent?: string;
  details: string;
  timestamp: Date;
  url?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${event.type.toUpperCase()}: ${event.details} from ${event.ip}`);
    }

    // In production, you might want to send this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // await monitoringService.logSecurityEvent(securityEvent);
    }
  }

  getRecentEvents(hours: number = 1): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(event => event.timestamp > cutoff);
  }

  getEventsByIP(ip: string, hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(event => 
      event.ip === ip && event.timestamp > cutoff
    );
  }

  getStats() {
    const last24h = this.getRecentEvents(24);
    const last1h = this.getRecentEvents(1);

    const stats = {
      total_events_24h: last24h.length,
      total_events_1h: last1h.length,
      rate_limits_24h: last24h.filter(e => e.type === 'rate_limit').length,
      bot_detections_24h: last24h.filter(e => e.type === 'bot_detected').length,
      suspicious_activity_24h: last24h.filter(e => e.type === 'suspicious_activity').length,
      top_ips_24h: this.getTopIPs(last24h, 10)
    };

    return stats;
  }

  private getTopIPs(events: SecurityEvent[], limit: number) {
    const ipCounts: { [ip: string]: number } = {};
    
    events.forEach(event => {
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    });

    return Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([ip, count]) => ({ ip, count }));
  }
}

export const securityLogger = new SecurityLogger();