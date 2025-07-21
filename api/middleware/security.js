import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import csrf from 'csurf';
import crypto from 'crypto';

// Rate limiting configurations
export const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
};

// API rate limiters
export const generalApiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts, please try again later.'
);

export const donationLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10,
  'Too many donation attempts, please try again later.'
);

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss://"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Input validation middleware
export const validateInput = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// Common validation rules
export const validationRules = {
  email: body('email').isEmail().normalizeEmail(),
  password: body('password').isLength({ min: 12 }).trim(),
  amount: body('amount').isNumeric().isFloat({ min: 1, max: 1000000 }),
  campaignId: body('campaignId').isUUID(),
  url: body('url').isURL({ protocols: ['http', 'https'] })
};

// XSS protection
export const xssProtection = xss();

// NoSQL injection protection
export const noSQLInjectionProtection = mongoSanitize();

// HTTP Parameter Pollution protection
export const hppProtection = hpp();

// CSRF protection
export const csrfProtection = csrf({ cookie: true });

// API versioning middleware
export const apiVersion = (version) => {
  return (req, res, next) => {
    req.apiVersion = version;
    res.setHeader('API-Version', version);
    next();
  };
};

// Request signing verification (for sensitive endpoints)
export const verifyRequestSignature = (secret) => {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Verify timestamp is within 5 minutes
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 300000) {
      return res.status(401).json({ error: 'Request timestamp too old' });
    }

    // Verify signature
    const payload = JSON.stringify(req.body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  };
};

// Error handling middleware
export const securityErrorHandler = (err, req, res, next) => {
  // Log security errors
  console.error('Security Error:', {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request' 
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    requestId: req.id
  });
};