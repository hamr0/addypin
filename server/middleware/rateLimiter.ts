import { Request, Response, NextFunction } from 'express';
import { securityLogger } from '../services/securityLogger';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    firstRequest: number;
    lastRequest: number;
  };
}

// In-memory store for rate limiting (consider Redis for production)
const rateLimitStore: RateLimitStore = {};
const dailyStore: RateLimitStore = {};

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  // Clean hourly store
  for (const ip in rateLimitStore) {
    if (now - rateLimitStore[ip].firstRequest > oneHour) {
      delete rateLimitStore[ip];
    }
  }

  // Clean daily store
  for (const ip in dailyStore) {
    if (now - dailyStore[ip].firstRequest > oneDay) {
      delete dailyStore[ip];
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Whitelist for development testing
const WHITELISTED_IPS = [
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1',
  '172.31.76.98', // Your current IP for testing
  '172.31.93.34', // User's current IP
];

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get real IP address (considering proxies)
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               'unknown';

    // Skip rate limiting for whitelisted IPs (development only)
    if (process.env.NODE_ENV === 'development' && WHITELISTED_IPS.includes(ip)) {
      console.log(`🔓 Skipping rate limit for whitelisted IP: ${ip}`);
      return next();
    }

    // Also skip if IP starts with development patterns
    if (process.env.NODE_ENV === 'development' && (ip.startsWith('127.') || ip.startsWith('::') || ip.startsWith('172.'))) {
      console.log(`🔓 Skipping rate limit for development IP: ${ip}`);
      return next();
    }

    const now = Date.now();
    const store = options.windowMs > 3600000 ? dailyStore : rateLimitStore;

    if (!store[ip]) {
      store[ip] = {
        count: 1,
        firstRequest: now,
        lastRequest: now
      };
      return next();
    }

    const timeWindow = now - store[ip].firstRequest;
    
    // Reset if outside time window
    if (timeWindow > options.windowMs) {
      store[ip] = {
        count: 1,
        firstRequest: now,
        lastRequest: now
      };
      return next();
    }

    // Check if limit exceeded
    if (store[ip].count >= options.maxRequests) {
      securityLogger.log({
        type: 'rate_limit',
        ip,
        details: `Rate limit exceeded: ${store[ip].count}/${options.maxRequests} requests in ${Math.ceil(timeWindow / 1000)}s`,
        url: req.url,
        userAgent: req.headers['user-agent'] as string
      });

      return res.status(429).json({
        error: options.message,
        retryAfter: Math.ceil((options.windowMs - timeWindow) / 1000),
        limit: options.maxRequests,
        remaining: 0
      });
    }

    // Increment counter
    store[ip].count++;
    store[ip].lastRequest = now;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': options.maxRequests.toString(),
      'X-RateLimit-Remaining': (options.maxRequests - store[ip].count).toString(),
      'X-RateLimit-Reset': new Date(store[ip].firstRequest + options.windowMs).toISOString()
    });

    next();
  };
}

// Anti-bot detection middleware
export function antibotMiddleware(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Block requests without user agent (likely bots)
  if (!userAgent) {
    securityLogger.log({
      type: 'bot_detected',
      ip,
      details: 'No user agent provided',
      url: req.url
    });
    return res.status(403).json({ error: 'User agent required' });
  }

  // Block known bot patterns
  const botPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scrape/i,
    /curl/i,
    /wget/i,
    /python/i,
    /postman/i
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    securityLogger.log({
      type: 'bot_detected',
      ip,
      details: `Bot pattern detected in user agent: ${userAgent}`,
      url: req.url,
      userAgent
    });
    return res.status(403).json({ error: 'Automated requests not allowed' });
  }

  // Check for suspicious patterns
  const suspiciousHeaders = [
    'x-requested-with',
    'x-forwarded-for',
    'x-real-ip'
  ];

  let suspiciousScore = 0;
  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) suspiciousScore++;
  });

  // If too many proxy headers, might be suspicious
  if (suspiciousScore > 2) {
    console.log(`Suspicious request from ${ip}: Multiple proxy headers`);
  }

  next();
}

// Specific rate limiters - balanced for security and usability
export const pinCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 pins per hour in dev, 5 in prod
  message: 'You\'re creating addypins too quickly! Please wait a moment before creating another one.'
});

export const dailyPinLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: process.env.NODE_ENV === 'development' ? 200 : 15, // 200 pins per day in dev, 15 in prod
  message: 'Daily pin creation limit reached from this location. Please try again tomorrow.'
});

export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests. Please slow down.'
});