import { Router } from 'express';
import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getCommentById,
  getUserComments,
  addReply,
  getThreadedComments,
  getReplies,
  getCommentThread,
} from '../controllers/commentController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import {
  validateCommentCreation,
  validateCommentUpdate,
  validateObjectId,
  validatePagination,
  validateReplyCreation,
  validateThreadedComments,
} from '../middleware/validation';
import { commentLimiter } from '../middleware/rateLimiting';
import { verifyCsrfToken } from '../middleware/csrf';
import { createDepthAwareCommentLimiter } from '../middleware/depthAwareRateLimiter';

const router = Router();


// Add comment to snippet (requires auth, rate limited)
router.post(
  '/snippets/:id/comments',
  requireAuth,
  verifyCsrfToken,
  commentLimiter,
  validateObjectId('id'),
  validateCommentCreation,
  addComment
);

// Get snippet comments (public, paginated, supports threaded view)
router.get(
  '/snippets/:id/comments',
  optionalAuth,
  validateObjectId('id'),
  validatePagination,
  getComments
);

// Get threaded comments for snippet
router.get(
  '/snippets/:id/comments/threaded',
  optionalAuth,
  validateObjectId('id'),
  validateThreadedComments,
  getThreadedComments
);

// Create reply to a comment
router.post(
  '/snippets/:id/comments/:commentId/replies',
  requireAuth,
  verifyCsrfToken,
  createDepthAwareCommentLimiter(), // Depth-aware rate limiting
  validateObjectId('id'),
  validateReplyCreation,
  addReply
);

// Get user's comments (requires auth)
router.get(
  '/my-comments',
  requireAuth,
  validatePagination,
  getUserComments
);

// Get direct replies to a comment (paginated)
router.get(
  '/:id/replies',
  optionalAuth,
  validateObjectId('id'),
  validatePagination,
  getReplies
);

// Get comment thread (comment with all nested replies)
router.get(
  '/:id/thread',
  optionalAuth,
  validateObjectId('id'),
  getCommentThread
);

// Get comment by ID (public)
router.get(
  '/:id',
  optionalAuth,
  validateObjectId('id'),
  getCommentById
);

// Update comment (requires auth, owner only)
router.put(
  '/:id',
  requireAuth,
  verifyCsrfToken,
  validateObjectId('id'),
  validateCommentUpdate,
  updateComment
);

// Delete comment (requires auth, owner only)
router.delete(
  '/:id',
  requireAuth,
  verifyCsrfToken,
  validateObjectId('id'),
  deleteComment
);

export default router;