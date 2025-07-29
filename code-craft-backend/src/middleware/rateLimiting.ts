import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';

// Helper function to create rate limiters
interface RateLimitMessage {
  error: {
    message: string;
    code: string;
    retryAfter?: number;
  };
}

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: RateLimitMessage;
  useAuth?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: options.useAuth ? authKeyGenerator : ((req: Request) => req.ip || 'unknown'),
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message,
  });
};

// Custom key generator for authenticated endpoints - always uses IP for security
const authKeyGenerator = (req: Request): string => {
  // Always use IP address for rate limiting to prevent abuse
  // This prevents users from bypassing limits by creating multiple accounts
  return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';
};

// Custom error handler for rate limiting
const rateLimitHandler = (req: Request, res: Response) => {
  logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  
  return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.ceil(RATE_LIMITS.GENERAL_API.windowMs / 1000),
    },
  });
};

// IP-based key generator - always uses IP address for consistent rate limiting
const guestAwareKeyGenerator = (req: Request): string => {
  // Always use IP to prevent rate limit bypass through authentication
  const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';
  const userType = req.user?.id ? 'auth' : 'guest';
  return `${userType}-${ipAddress}`;
};

// Code execution rate limiter (strictest, different limits for guests)
export const codeExecutionLimiter = (req: Request, res: Response, next: NextFunction) => {
  const isGuest = !req.user;
  
  const limiter = rateLimit({
    windowMs: RATE_LIMITS.CODE_EXECUTION.windowMs,
    max: isGuest ? Math.floor(RATE_LIMITS.CODE_EXECUTION.max / 2) : RATE_LIMITS.CODE_EXECUTION.max, // Guests get half the limit
    keyGenerator: guestAwareKeyGenerator,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for ${guestAwareKeyGenerator(req)} on ${req.path}`);
      
      const message = isGuest 
        ? 'Guest users have limited executions. Please sign in for more.'
        : 'Too many code execution requests, please try again later';
      
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: {
          message,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil(RATE_LIMITS.CODE_EXECUTION.windowMs / 1000),
          isGuest,
        },
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  limiter(req, res, next);
};

// Snippet creation rate limiter
export const snippetCreationLimiter = rateLimit({
  windowMs: RATE_LIMITS.SNIPPET_CREATION.windowMs,
  max: RATE_LIMITS.SNIPPET_CREATION.max,
  keyGenerator: authKeyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many snippet creation requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.ceil(RATE_LIMITS.SNIPPET_CREATION.windowMs / 1000),
    },
  },
});

// Comment creation rate limiter
export const commentLimiter = rateLimit({
  windowMs: RATE_LIMITS.COMMENT_CREATION.windowMs,
  max: RATE_LIMITS.COMMENT_CREATION.max,
  keyGenerator: authKeyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many comment requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.ceil(RATE_LIMITS.COMMENT_CREATION.windowMs / 1000),
    },
  },
});

// General API rate limiter with enhanced IP detection
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL_API.windowMs,
  max: RATE_LIMITS.GENERAL_API.max,
  keyGenerator: (req: Request) => {
    // Enhanced IP detection for proxied requests
    return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || req.headers['x-real-ip']?.toString() || 'unknown';
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: Math.ceil(RATE_LIMITS.GENERAL_API.windowMs / 1000),
    },
  },
  // Skip successful requests to prevent counting failed requests
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Star/unstar rate limiter (moderate)
export const starLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 stars per minute
  keyGenerator: authKeyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many star/unstar requests, please try again later',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: 60,
    },
  },
});

// Webhook rate limiter (for external services)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  keyGenerator: (req: Request) => {
    // Enhanced IP detection for webhooks
    return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || req.headers['x-real-ip']?.toString() || 'unknown';
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many webhook requests',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter: 60,
    },
  },
});

// Notification fetch rate limiter
export const notificationLimiter = rateLimit({
  windowMs: RATE_LIMITS.NOTIFICATION_FETCH.windowMs,
  max: RATE_LIMITS.NOTIFICATION_FETCH.max,
  keyGenerator: authKeyGenerator,
  handler: (req: Request, res: Response) => {
    logger.warn(`Notification rate limit exceeded for ${req.ip} on ${req.path}`);
    
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: {
        message: 'Too many notification requests, please try again later',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: Math.ceil(RATE_LIMITS.NOTIFICATION_FETCH.windowMs / 1000),
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter to prevent brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts per 15 minutes
  keyGenerator: (req: Request) => {
    // Use IP for auth endpoints to prevent credential stuffing
    return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Authentication rate limit exceeded for ${req.ip} on ${req.path}`);
    
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: {
        message: 'Too many authentication attempts, please try again later',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: 900, // 15 minutes
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});
