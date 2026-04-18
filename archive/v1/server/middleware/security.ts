import { Request, Response, NextFunction } from 'express';

// CAPTCHA-like verification (simple math challenge)
export function simpleCaptchaMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for GET requests
  if (req.method === 'GET') {
    return next();
  }

  const captchaAnswer = req.headers['x-captcha-answer'];
  const captchaChallenge = req.headers['x-captcha-challenge'];

  if (!captchaAnswer || !captchaChallenge) {
    // For now, skip captcha requirement but log suspicious activity
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    console.log(`Request without captcha from ${ip}: ${req.url}`);
    return next();
  }

  // Verify simple math challenge
  try {
    const [num1, operator, num2] = captchaChallenge.toString().split(' ');
    let expectedAnswer = 0;
    
    switch (operator) {
      case '+':
        expectedAnswer = parseInt(num1) + parseInt(num2);
        break;
      case '-':
        expectedAnswer = parseInt(num1) - parseInt(num2);
        break;
      case '*':
        expectedAnswer = parseInt(num1) * parseInt(num2);
        break;
      default:
        return res.status(400).json({ error: 'Invalid captcha challenge' });
    }

    if (parseInt(captchaAnswer.toString()) !== expectedAnswer) {
      return res.status(403).json({ error: 'Invalid captcha answer' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid captcha format' });
  }

  next();
}

// Honeypot field detection
export function honeypotMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check for common honeypot field names
  const honeypotFields = ['website', 'url', 'homepage', 'phone', 'fax'];
  
  for (const field of honeypotFields) {
    if (req.body[field] && req.body[field].trim() !== '') {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      console.log(`Bot detected via honeypot from ${ip}: filled field ${field}`);
      
      // Return success to not reveal the honeypot
      return res.status(200).json({ message: 'Success' });
    }
  }

  next();
}

// Request timing analysis (detect suspiciously fast requests)
const requestTimings: { [ip: string]: number[] } = {};

export function timingAnalysisMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestTimings[ip]) {
    requestTimings[ip] = [];
  }

  // Keep only recent requests (last 5 minutes)
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  requestTimings[ip] = requestTimings[ip].filter(time => time > fiveMinutesAgo);

  // Add current request
  requestTimings[ip].push(now);

  // Check for suspiciously fast requests (more than 10 requests in 1 minute)
  const oneMinuteAgo = now - 60 * 1000;
  const recentRequests = requestTimings[ip].filter(time => time > oneMinuteAgo);

  if (recentRequests.length > 10) {
    console.log(`Suspicious rapid requests from ${ip}: ${recentRequests.length} in 1 minute`);
    return res.status(429).json({ 
      error: 'Too many requests too quickly. Please slow down.',
      retryAfter: 60 
    });
  }

  next();
}

// Geographic blocking (optional - block certain countries known for bot traffic)
export function geoBlockingMiddleware(blockedCountries: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
    
    if (country && blockedCountries.includes(country.toString().toUpperCase())) {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      console.log(`Blocked request from ${country} (${ip})`);
      return res.status(403).json({ error: 'Access denied from your location' });
    }

    next();
  };
}

// Clean up old timing data every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const ip in requestTimings) {
    requestTimings[ip] = requestTimings[ip].filter(time => time > oneHourAgo);
    if (requestTimings[ip].length === 0) {
      delete requestTimings[ip];
    }
  }
}, 60 * 60 * 1000);