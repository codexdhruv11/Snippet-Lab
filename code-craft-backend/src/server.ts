import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase, disconnectDatabase } from './config/database';
import { config } from './config/env';
import { logger, requestLogger } from './utils/logger';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiting';
import { csrfProtection, verifyCsrfToken } from './middleware/csrf';
import { requestIdMiddleware } from './middleware/requestId';
import apiRoutes from './routes';

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware with comprehensive headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      reportUri: '/api/csp-report',
    },
  },
  // Additional security headers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
}));

// Custom security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
  // Cache control for security
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/users')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  
  next();
});

// CORS configuration
app.use(cors({
  origin: config.corsOrigin.split(',').map((origin: string) => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
}));

// Cookie parser middleware (must be before routes)
app.use(cookieParser());

// Request ID middleware for correlation tracking
app.use(requestIdMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// CSRF protection middleware
app.use(csrfProtection);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Code-Craft Backend API',
    version: '1.0.0',
    description: 'MERN stack backend for Code-Craft - A free code editor and snippet sharing platform',
    documentation: '/api/docs',
    health: '/api/health',
    features: [
      'Code execution in 10+ programming languages (all free)',
      'Snippet sharing and management',
      'Comments and stars system',
      'User profiles and statistics',
      'No premium restrictions - everything is free for authenticated users',
    ],
  });
});

// API versioning support
const API_VERSION = 'v1';

// Mount API routes with versioning
app.use('/api', apiRoutes); // Default routes without version
app.use(`/api/${API_VERSION}`, apiRoutes); // Versioned routes

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Server startup function
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Code-Craft Backend API started successfully!`);
      logger.info(`📍 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`📚 API Documentation: http://localhost:${config.port}/api/docs`);
      logger.info(`❤️  Health Check: http://localhost:${config.port}/api/health`);
      logger.info(`🎯 Features: All languages free, no premium restrictions`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close cache connection
          const { cache } = await import('./utils/cache');
          await cache.close();
          logger.info('Cache connection closed');
          
          await disconnectDatabase();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle process signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  console.log('🚀 Starting Code-Craft Backend Server...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Port:', process.env.PORT || '3001');
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

// Export app for testing
export default app;