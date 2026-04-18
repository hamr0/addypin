// Umami Analytics Integration
// Self-hosted privacy-focused web analytics

export interface UmamiEvent {
  website: string;
  name: string;
  data?: Record<string, any>;
}

export interface UmamiPageView {
  website: string;
  url: string;
  title?: string;
  referrer?: string;
}

class UmamiService {
  private apiUrl: string;
  private websiteId: string;
  private enabled: boolean;

  constructor() {
    // These will be set via environment variables in production
    this.apiUrl = process.env.UMAMI_API_URL || '';
    this.websiteId = process.env.UMAMI_WEBSITE_ID || '';
    this.enabled = !!(this.apiUrl && this.websiteId);
    
    if (!this.enabled && process.env.NODE_ENV === 'production') {
      console.warn('Umami analytics not configured. Set UMAMI_API_URL and UMAMI_WEBSITE_ID environment variables.');
    }
  }

  async trackPageView(data: UmamiPageView): Promise<void> {
    if (!this.enabled) return;

    try {
      const response = await fetch(`${this.apiUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Umami/1.0',
        },
        body: JSON.stringify({
          type: 'pageview',
          payload: {
            website: this.websiteId,
            url: data.url,
            title: data.title,
            referrer: data.referrer,
          },
        }),
      });

      if (!response.ok) {
        console.warn('Umami pageview tracking failed:', response.status);
      }
    } catch (error) {
      console.warn('Umami pageview tracking error:', error);
    }
  }

  async trackEvent(data: UmamiEvent): Promise<void> {
    if (!this.enabled) return;

    try {
      const response = await fetch(`${this.apiUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Umami/1.0',
        },
        body: JSON.stringify({
          type: 'event',
          payload: {
            website: this.websiteId,
            name: data.name,
            data: data.data,
          },
        }),
      });

      if (!response.ok) {
        console.warn('Umami event tracking failed:', response.status);
      }
    } catch (error) {
      console.warn('Umami event tracking error:', error);
    }
  }
}

export const umamiService = new UmamiService();