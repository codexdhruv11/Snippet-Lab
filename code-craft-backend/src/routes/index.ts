import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import snippetRoutes from './snippetRoutes';
import commentRoutes from './commentRoutes';
import starRoutes from './starRoutes';
import executionRoutes from './executionRoutes';
import followRoutes from './followRoutes';
import notificationRoutes from './notificationRoutes';
import webhookRoutes from './webhookRoutes';
import cspReportRoutes from './cspReportRoutes';
import { HTTP_STATUS } from '../utils/constants';
import { logger } from '../utils/logger';
import { verifyCsrfToken } from '../middleware/csrf';

const router = Router();

// CSRF token endpoint
router.get('/csrf-token', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    csrfToken: req.csrfToken,
  });
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    message: 'Code-Craft Backend API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version information
router.get('/version', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    version: '1.0.0',
    name: 'Code-Craft Backend API',
    description: 'MERN stack backend for Code-Craft - A free code editor and snippet sharing platform',
    features: [
      'Code execution in 10+ languages (all free)',
      'Snippet sharing and management',
      'Comments and stars',
      'User profiles and statistics',
      'No premium restrictions - everything is free',
    ],
    supportedLanguages: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 
      'Rust', 'C++', 'C#', 'Ruby', 'Swift'
    ],
  });
});

// Mount route modules with appropriate prefixes and CSRF protection
router.use('/auth', authRoutes);
router.use('/users', verifyCsrfToken, userRoutes);
router.use('/users', verifyCsrfToken, followRoutes); // Mount follow routes under /users
router.use('/snippets', verifyCsrfToken, snippetRoutes);
router.use('/comments', verifyCsrfToken, commentRoutes);
router.use('/stars', verifyCsrfToken, starRoutes);
router.use('/notifications', verifyCsrfToken, notificationRoutes);
router.use('/executions', verifyCsrfToken, executionRoutes);
router.use('/languages', executionRoutes); // For supported languages endpoint (read-only)
router.use('/webhooks', webhookRoutes);

// CSP reporting endpoint (no CSRF check as it's called by browsers)
router.use('/', cspReportRoutes);

// API documentation endpoint
router.get('/docs', (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    message: 'Code-Craft Backend API Documentation',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      health: 'GET /api/health - Health check',
      version: 'GET /api/version - API version info',
      
      // Authentication endpoints
      auth: {
        register: 'POST /api/auth/register - Register new user',
        login: 'POST /api/auth/login - Login user',
      },
      
      // User endpoints
      users: {
        me: 'GET /api/users/me - Get current user profile',
        updateMe: 'PATCH /api/users/me - Update user profile',
        stats: 'GET /api/users/:id/stats - Get user statistics',
        profile: 'GET /api/users/:id/profile - Get user public profile',
      },
      
      // Snippet endpoints
      snippets: {
        create: 'POST /api/snippets - Create snippet',
        list: 'GET /api/snippets - Get all snippets (paginated)',
        starred: 'GET /api/snippets/starred - Get starred snippets',
        byUser: 'GET /api/snippets/user/:userId - Get snippets by user',
        get: 'GET /api/snippets/:id - Get specific snippet',
        update: 'PUT /api/snippets/:id - Update snippet',
        delete: 'DELETE /api/snippets/:id - Delete snippet',
      },
      
      // Comment endpoints
      comments: {
        add: 'POST /api/comments/snippets/:id/comments - Add comment',
        list: 'GET /api/comments/snippets/:id/comments - Get snippet comments',
        my: 'GET /api/comments/my-comments - Get user comments',
        get: 'GET /api/comments/:id - Get comment by ID',
        update: 'PUT /api/comments/:id - Update comment',
        delete: 'DELETE /api/comments/:id - Delete comment',
      },
      
      // Star endpoints
      stars: {
        toggle: 'POST /api/stars/snippets/:id/stars - Toggle star',
        count: 'GET /api/stars/snippets/:id/stars/count - Get star count',
        check: 'GET /api/stars/snippets/:id/stars/me - Check if starred',
        list: 'GET /api/stars/snippets/:id/stars - Get users who starred',
        stats: 'GET /api/stars/snippets/:id/stars/stats - Get star statistics',
      },
      
      // Follow endpoints
      follows: {
        toggle: {
          endpoint: 'POST /api/follows/users/:id/follows',
          description: 'Toggle follow/unfollow a user',
          auth: 'Required',
          params: { id: 'Target user ID' },
          response: '{ isFollowing: boolean, followerCount: number }',
        },
        followerCount: {
          endpoint: 'GET /api/follows/users/:id/followers/count',
          description: 'Get follower count for a user',
          auth: 'Optional',
          params: { id: 'User ID' },
          response: '{ count: number }',
        },
        followingCount: {
          endpoint: 'GET /api/follows/users/:id/following/count',
          description: 'Get following count for a user',
          auth: 'Optional',
          params: { id: 'User ID' },
          response: '{ count: number }',
        },
        check: {
          endpoint: 'GET /api/follows/users/:id/follows/me',
          description: 'Check if current user follows target user',
          auth: 'Required',
          params: { id: 'Target user ID' },
          response: '{ isFollowing: boolean }',
        },
        followers: {
          endpoint: 'GET /api/follows/users/:id/followers',
          description: 'Get paginated list of followers',
          auth: 'Optional',
          params: { id: 'User ID' },
          query: { page: 'Page number (default: 1)', limit: 'Items per page (default: 20, max: 100)' },
          response: '{ data: User[], pagination: { page, limit, totalPages, totalItems, hasMore } }',
        },
        following: {
          endpoint: 'GET /api/follows/users/:id/following',
          description: 'Get paginated list of users being followed',
          auth: 'Optional',
          params: { id: 'User ID' },
          query: { page: 'Page number (default: 1)', limit: 'Items per page (default: 20, max: 100)' },
          response: '{ data: User[], pagination: { page, limit, totalPages, totalItems, hasMore } }',
        },
      },
      
      // Execution endpoints
      executions: {
        execute: 'POST /api/executions - Execute code (all languages free)',
        history: 'GET /api/executions - Get execution history',
        stats: 'GET /api/executions/stats - Get execution statistics',
        get: 'GET /api/executions/:id - Get execution by ID',
        languages: 'GET /api/executions/languages - Get supported languages',
      },
      
      // Notification endpoints
      notifications: {
        list: {
          endpoint: 'GET /api/notifications',
          description: 'Get user notifications with pagination',
          auth: 'Required',
          query: { 
            page: 'Page number (default: 1)', 
            limit: 'Items per page (default: 20, max: 50)',
            unreadOnly: 'Filter to show only unread notifications (optional boolean)'
          },
          response: '{ data: Notification[], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }',
        },
        unreadCount: {
          endpoint: 'GET /api/notifications/unread-count',
          description: 'Get count of unread notifications',
          auth: 'Required',
          response: '{ count: number }',
        },
        markAsRead: {
          endpoint: 'PATCH /api/notifications/:id/read',
          description: 'Mark a specific notification as read',
          auth: 'Required',
          params: { id: 'Notification ID' },
          response: '{ message: string }',
        },
        markAllAsRead: {
          endpoint: 'PATCH /api/notifications/read-all',
          description: 'Mark all user notifications as read',
          auth: 'Required',
          response: '{ message: string, count: number }',
        },
      },
      
      // Webhook endpoints
      webhooks: {
        health: 'GET /api/webhooks/health - Webhook health check',
      },
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      description: 'Use JWT token obtained from /api/auth/login or /api/auth/register',
    },
    rateLimit: {
      general: '100 requests per minute per IP',
      codeExecution: '10 requests per minute per user',
      snippetCreation: '5 requests per minute per user',
      comments: '20 requests per minute per user',
      stars: '30 requests per minute per user',
    },
    features: {
      noRestrictions: 'All languages and features are free for authenticated users',
      pagination: 'Most list endpoints support pagination with page and limit parameters',
      filtering: 'Snippets can be filtered by language and searched by title',
      realtime: 'Consider implementing WebSocket support for real-time updates',
    },
  });
});

// Log all API requests in development
if (process.env.NODE_ENV === 'development') {
  router.use('*', (req: Request, res: Response, next) => {
    logger.debug(`API Request: ${req.method} ${req.originalUrl}`, {
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      user: req.user?.id || 'anonymous',
    });
    next();
  });
}

export default router;