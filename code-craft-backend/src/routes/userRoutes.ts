import { Router } from 'express';
import {
  getCurrentUser,
  updateUser,
  getUserStats,
  getUserProfile,
  changePassword,
  searchUsers,
  getContributionGraph,
} from '../controllers/userController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateUserUpdate, validateObjectId, validatePasswordChange, validatePagination, validateUserSearch, validateContributionGraph } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import { verifyCsrfToken } from '../middleware/csrf';

const router = Router();

// Apply general rate limiting to all user routes
router.use(generalLimiter);

// User search (public with optional auth for enriched data)
router.get('/search', optionalAuth, validateUserSearch, validatePagination, searchUsers);

// Get current user profile (requires authentication)
router.get('/me', requireAuth, getCurrentUser);

// Update user profile (requires authentication)
router.patch('/me', requireAuth, verifyCsrfToken, validateUserUpdate, updateUser);

// Change password (requires authentication)
router.post('/me/change-password', requireAuth, verifyCsrfToken, validatePasswordChange, changePassword);

// Get user statistics (public)
router.get('/:id/stats', validateObjectId('id'), getUserStats);

// Get user public profile (public)
router.get('/:id/profile', validateObjectId('id'), getUserProfile);

// Get user contribution graph (public)
router.get('/:id/contribution-graph', validateObjectId('id'), optionalAuth, validateContributionGraph, getContributionGraph);

export default router;
