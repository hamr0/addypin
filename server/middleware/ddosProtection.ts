import { Request, Response, NextFunction } from 'express';
import { securityLogger } from '../services/securityLogger';
import { isIPWhitelisted } from './rateLimiter';

interface DDosMetrics {
  requestCount: number;
  firstRequest: number;
  lastRequest: number;
  userAgent: string;
  endpoints: Set<string>;
  suspiciousPatterns: string[];
}

// In-memory DDoS tracking
const ddosTracker = new Map<string, DDosMetrics>();
const DDOS_THRESHOLDS = {
  REQUESTS_PER_MINUTE: 30,
  REQUESTS_PER_HOUR: 200,
  UNIQUE_ENDPOINTS_THRESHOLD: 15,
  SUSPICIOUS_SCORE_THRESHOLD: 5
};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  ddosTracker.forEach((metrics, ip) => {
    if (now - metrics.firstRequest > oneHour) {
      ddosTracker.delete(ip);
    }
  });
}, 5 * 60 * 1000);

export function ddosProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const endpoint = req.url;
  const now = Date.now();

  // Skip DDoS protection for whitelisted IPs
  if (isIPWhitelisted(ip)) {
    return next();
  }

  // Initialize or update metrics for this IP
  if (!ddosTracker.has(ip)) {
    ddosTracker.set(ip, {
      requestCount: 1,
      firstRequest: now,
      lastRequest: now,
      userAgent,
      endpoints: new Set([endpoint]),
      suspiciousPatterns: []
    });
    return next();
  }

  const metrics = ddosTracker.get(ip)!;
  metrics.requestCount++;
  metrics.lastRequest = now;
  metrics.endpoints.add(endpoint);

  // Check for DDoS patterns
  const timeWindow = now - metrics.firstRequest;
  const requestsPerMinute = (metrics.requestCount / (timeWindow / 60000));
  const requestsPerHour = (metrics.requestCount / (timeWindow / 3600000));

  // Detect suspicious patterns
  const suspiciousPatterns: string[] = [];
  
  // Pattern 1: Too many requests per minute
  if (requestsPerMinute > DDOS_THRESHOLDS.REQUESTS_PER_MINUTE) {
    suspiciousPatterns.push(`High request rate: ${requestsPerMinute.toFixed(1)}/min`);
  }

  // Pattern 2: Too many unique endpoints accessed
  if (metrics.endpoints.size > DDOS_THRESHOLDS.UNIQUE_ENDPOINTS_THRESHOLD) {
    suspiciousPatterns.push(`Endpoint scanning: ${metrics.endpoints.size} unique endpoints`);
  }

  // Pattern 3: Changing user agents (bot rotation)
  if (userAgent !== metrics.userAgent && metrics.userAgent) {
    suspiciousPatterns.push('User agent rotation detected');
    metrics.userAgent = userAgent;
  }

  // Pattern 4: Rapid consecutive requests
  if (metrics.requestCount > 1) {
    const timeSinceLastRequest = now - metrics.lastRequest;
    if (timeSinceLastRequest < 100) { // Less than 100ms between requests
      suspiciousPatterns.push('Rapid fire requests detected');
    }
  }

  // Update suspicious patterns
  metrics.suspiciousPatterns = [...new Set([...metrics.suspiciousPatterns, ...suspiciousPatterns])];

  // Calculate threat level
  const threatLevel = calculateThreatLevel(metrics, requestsPerMinute, requestsPerHour);

  // Take action based on threat level
  if (threatLevel >= DDOS_THRESHOLDS.SUSPICIOUS_SCORE_THRESHOLD) {
    securityLogger.log({
      type: 'suspicious_activity',
      ip,
      details: `DDoS attack detected. Threat level: ${threatLevel}/10. Patterns: ${metrics.suspiciousPatterns.join(', ')}`,
      url: req.url,
      userAgent,
      metadata: {
        requestCount: metrics.requestCount,
        requestsPerMinute: requestsPerMinute.toFixed(1),
        uniqueEndpoints: metrics.endpoints.size,
        timeWindow: Math.round(timeWindow / 1000) + 's'
      }
    });

    return res.status(429).json({
      error: 'DDoS protection activated. Your IP has been temporarily blocked due to suspicious activity patterns.',
      code: 'DDOS_PROTECTION',
      retryAfter: 300, // 5 minutes
      details: 'If you believe this is an error, please wait a few minutes and try again with normal browsing behavior.'
    });
  }

  // Log high activity for monitoring
  if (threatLevel >= 3) {
    console.log(`🔍 High activity from ${ip}: threat level ${threatLevel}, ${requestsPerMinute.toFixed(1)} req/min`);
  }

  next();
}

function calculateThreatLevel(metrics: DDosMetrics, requestsPerMinute: number, requestsPerHour: number): number {
  let score = 0;

  // Request rate scoring
  if (requestsPerMinute > 50) score += 4;
  else if (requestsPerMinute > 30) score += 3;
  else if (requestsPerMinute > 15) score += 2;
  else if (requestsPerMinute > 10) score += 1;

  // Endpoint diversity scoring
  if (metrics.endpoints.size > 20) score += 3;
  else if (metrics.endpoints.size > 15) score += 2;
  else if (metrics.endpoints.size > 10) score += 1;

  // Suspicious pattern scoring
  score += Math.min(metrics.suspiciousPatterns.length, 3);

  return Math.min(score, 10); // Cap at 10
}

// Endpoint to check DDoS protection status (for monitoring)
export function getDDoSStatus() {
  const now = Date.now();
  const activeThreats: any[] = [];
  ddosTracker.forEach((metrics, ip) => {
    const requestsPerMinute = metrics.requestCount / ((now - metrics.firstRequest) / 60000);
    if (requestsPerMinute > 10 || metrics.suspiciousPatterns.length > 0) {
      activeThreats.push({
        ip: ip.replace(/\d{1,3}$/, 'xxx'), // Mask last octet for privacy
        requestCount: metrics.requestCount,
        requestsPerMinute: requestsPerMinute.toFixed(1),
        uniqueEndpoints: metrics.endpoints.size,
        suspiciousPatterns: metrics.suspiciousPatterns.length,
        threatLevel: calculateThreatLevel(metrics, requestsPerMinute, 
          metrics.requestCount / ((now - metrics.firstRequest) / 3600000))
      });
    }
  });

  return {
    activeConnections: ddosTracker.size,
    activeThreats: activeThreats.length,
    threats: activeThreats.slice(0, 10), // Only show top 10 threats
    timestamp: new Date().toISOString()
  };
}