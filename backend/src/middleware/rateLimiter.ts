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

// Whitelist for development testing and user's devices
const WHITELISTED_IPS = [
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1',
  '172.31.76.98', // Development IP
  '172.31.93.34', // Development IP
  '172.31.118.66', // Development IP
  '35.185.93.79', // User's external IP (phone/laptop)
];

// Whitelisted emails (user's email exempt from email limits)
const WHITELISTED_EMAILS = [
  'avoidaccess@msn.com', // User's email - unlimited pins
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

// Enhanced anti-bot detection middleware with friendly messages
export function antibotMiddleware(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Skip anti-bot for whitelisted IPs
  if (isIPWhitelisted(ip)) {
    return next();
  }

  // Block requests without user agent (likely bots)
  if (!userAgent) {
    securityLogger.log({
      type: 'bot_detected',
      ip,
      details: 'No user agent provided',
      url: req.url
    });
    return res.status(403).json({ 
      error: '🤖 Missing browser information. Please use a standard web browser to access addypin.',
      code: 'NO_USER_AGENT'
    });
  }

  // Block known bot patterns with friendly messages
  const botPatterns = [
    { pattern: /bot/i, message: 'Automated bot detected' },
    { pattern: /crawl/i, message: 'Web crawler detected' },
    { pattern: /spider/i, message: 'Web spider detected' },
    { pattern: /scrape/i, message: 'Web scraper detected' },
    { pattern: /curl/i, message: 'Command line tool detected' },
    { pattern: /wget/i, message: 'Download tool detected' },
    { pattern: /python/i, message: 'Python script detected' },
    { pattern: /postman/i, message: 'API testing tool detected' },
    { pattern: /headless/i, message: 'Headless browser detected' },
    { pattern: /phantom/i, message: 'Automated browser detected' }
  ];

  const detectedBot = botPatterns.find(bot => bot.pattern.test(userAgent));
  if (detectedBot) {
    securityLogger.log({
      type: 'bot_detected',
      ip,
      details: `${detectedBot.message}: ${userAgent}`,
      url: req.url,
      userAgent
    });
    return res.status(403).json({ 
      error: `🤖 ${detectedBot.message}. addypin is designed for human users. Please use a standard web browser.`,
      code: 'BOT_DETECTED'
    });
  }

  // Advanced suspicious activity detection
  const suspiciousIndicators = {
    noReferer: !req.headers.referer && req.method === 'POST',
    unusualContentType: req.headers['content-type'] && !req.headers['content-type'].includes('application/json'),
    rapidRequests: checkRapidRequests(ip),
    suspiciousHeaders: countSuspiciousHeaders(req)
  };

  let suspicionScore = 0;
  if (suspiciousIndicators.noReferer) suspicionScore += 2;
  if (suspiciousIndicators.unusualContentType) suspicionScore += 1;
  if (suspiciousIndicators.rapidRequests) suspicionScore += 3;
  if (suspiciousIndicators.suspiciousHeaders > 2) suspicionScore += 2;

  // High suspicion - apply strict rate limiting
  if (suspicionScore >= 4) {
    securityLogger.log({
      type: 'suspicious_activity',
      ip,
      details: `High suspicion score: ${suspicionScore}. Indicators: ${JSON.stringify(suspiciousIndicators)}`,
      url: req.url,
      userAgent
    });
    // Apply stricter rate limiting for suspicious users
    return strictBotLimiter(req, res, next);
  }

  // Medium suspicion - log but allow
  if (suspicionScore >= 2) {
    console.log(`⚠️ Moderate suspicious activity from ${ip}: score ${suspicionScore}`);
  }

  next();
}

// Helper function to detect rapid requests from same IP
const rapidRequestTracker = new Map<string, number[]>();
function checkRapidRequests(ip: string): boolean {
  const now = Date.now();
  if (!rapidRequestTracker.has(ip)) {
    rapidRequestTracker.set(ip, [now]);
    return false;
  }

  const requests = rapidRequestTracker.get(ip)!;
  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);
  recentRequests.push(now);
  rapidRequestTracker.set(ip, recentRequests);

  // More than 10 requests in 1 minute is suspicious
  return recentRequests.length > 10;
}

// Helper function to count suspicious headers
function countSuspiciousHeaders(req: Request): number {
  const suspiciousHeaders = [
    'x-requested-with',
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  return suspiciousHeaders.filter(header => req.headers[header]).length;
}

// Enhanced DDoS protection with friendly messages
export const pinCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 pins per hour in dev, 5 in prod
  message: '🚀 Wow, you\'re on fire with creating addypins! Please take a quick break (60 minutes) to prevent spam. Thanks for using addypin responsibly!'
});

export const dailyPinLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: process.env.NODE_ENV === 'development' ? 200 : 5, // 200 pins per day in dev, 5 in prod (strict for production)
  message: '📍 You\'ve reached your daily limit of 5 addypins per day from this location. This helps us prevent spam and keep addypin fast for everyone! Try again tomorrow.'
});

export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limits in dev
  message: '⚡ You\'re browsing addypin quite enthusiastically! Please slow down a bit to help us maintain performance for all users.'
});

// New strict bot protection limiter
export const strictBotLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // Only 20 requests per 5 minutes for suspicious patterns
  message: '🤖 Automated activity detected. If you\'re a real user, please wait a few minutes and try again.'
});

// Helper function to check if email is whitelisted
export function isEmailWhitelisted(email: string): boolean {
  return WHITELISTED_EMAILS.includes(email);
}

// Helper function to check if IP is whitelisted
export function isIPWhitelisted(ip: string): boolean {
  return WHITELISTED_IPS.includes(ip) || 
         (process.env.NODE_ENV === 'development' && 
          (ip.startsWith('127.') || ip.startsWith('::') || ip.startsWith('172.')));
}