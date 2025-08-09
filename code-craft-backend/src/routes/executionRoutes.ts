import { Router } from 'express';
import {
  executeCode,
  getUserExecutions,
  getSupportedLanguages,
  getExecutionStats,
  getExecutionById,
} from '../controllers/executionController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import {
  validateCodeExecution,
  validateObjectId,
  validatePagination,
} from '../middleware/validation';
import { codeExecutionLimiter } from '../middleware/rateLimiting';
import { verifyCsrfToken } from '../middleware/csrf';

const router = Router();


// Execute code (allows guest with stricter rate limiting)
// UPDATED: Guest users allowed with stricter rate limits
router.post(
  '/',
  optionalAuth,  // Changed from requireAuth to optionalAuth
  verifyCsrfToken,
  codeExecutionLimiter,
  validateCodeExecution,
  executeCode
);

// Get user execution history (requires auth, paginated)
router.get(
  '/',
  requireAuth,
  validatePagination,
  getUserExecutions
);

// Get supported languages (public)
// CRITICAL: All languages shown as available to all users
router.get(
  '/languages',
  getSupportedLanguages
);

// Get execution statistics for current user (requires auth)
router.get(
  '/stats',
  requireAuth,
  getExecutionStats
);

// Get specific execution by ID (requires auth, owner only)
router.get(
  '/:id',
  requireAuth,
  validateObjectId('id'),
  getExecutionById
);

export default router;