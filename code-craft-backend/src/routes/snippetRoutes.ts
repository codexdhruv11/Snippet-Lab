import { Router } from 'express';
import {
  createSnippet,
  getSnippets,
  getSnippetById,
  updateSnippet,
  deleteSnippet,
  getStarredSnippets,
  getSnippetsByUser,
  getPopularTags,
  getFeedSnippets,
} from '../controllers/snippetController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import {
  validateSnippetCreation,
  validateSnippetUpdate,
  validateObjectId,
  validatePagination,
  validateSearch,
} from '../middleware/validation';
import { snippetCreationLimiter } from '../middleware/rateLimiting';
import { verifyCsrfToken } from '../middleware/csrf';

const router = Router();


// Create snippet (requires auth, rate limited)
router.post(
  '/',
  requireAuth,
  verifyCsrfToken,
  snippetCreationLimiter,
  validateSnippetCreation,
  createSnippet
);

// Get all snippets (public, paginated)
router.get(
  '/',
  optionalAuth,
  validatePagination,
  validateSearch,
  getSnippets
);

// Get feed snippets from followed users (requires auth)
router.get(
  '/feed',
  requireAuth,
  validatePagination,
  getFeedSnippets
);

// Get user's starred snippets (requires auth)
router.get(
  '/starred',
  requireAuth,
  validatePagination,
  getStarredSnippets
);

// Get popular tags (public)
router.get(
  '/tags/popular',
  optionalAuth,
  validatePagination,
  getPopularTags
);

// Get snippets by user (public)
router.get(
  '/user/:userId',
  optionalAuth,
  validatePagination,
  getSnippetsByUser
);

// Get specific snippet (public)
router.get(
  '/:id',
  optionalAuth,
  validateObjectId('id'),
  getSnippetById
);

// Update snippet (requires auth, owner only)
router.put(
  '/:id',
  requireAuth,
  verifyCsrfToken,
  validateObjectId('id'),
  validateSnippetUpdate,
  updateSnippet
);

// Delete snippet (requires auth, owner only)
router.delete(
  '/:id',
  requireAuth,
  verifyCsrfToken,
  validateObjectId('id'),
  deleteSnippet
);

export default router;