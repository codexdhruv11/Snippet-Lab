import { Router } from 'express';
import {
  toggleFollow,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  getFollowers,
  getFollowing,
} from '../controllers/followController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateObjectId } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';

const router = Router();

// For follow operations, we'll use the general limiter
// Follow operations are less frequent than comments/snippets

// Toggle follow/unfollow - requires authentication
router.post(
  '/users/:id/follows',
  requireAuth,
  validateObjectId('id'),
  generalLimiter,
  toggleFollow
);

// Get follower count - public endpoint
router.get(
  '/users/:id/followers/count',
  validateObjectId('id'),
  generalLimiter,
  getFollowerCount
);

// Get following count - public endpoint
router.get(
  '/users/:id/following/count',
  validateObjectId('id'),
  generalLimiter,
  getFollowingCount
);

// Check if current user follows target user - requires authentication
router.get(
  '/users/:id/follows/me',
  requireAuth,
  validateObjectId('id'),
  generalLimiter,
  isFollowing
);

// Get paginated list of followers - optional authentication
router.get(
  '/users/:id/followers',
  optionalAuth,
  validateObjectId('id'),
  generalLimiter,
  getFollowers
);

// Get paginated list of following - optional authentication
router.get(
  '/users/:id/following',
  optionalAuth,
  validateObjectId('id'),
  generalLimiter,
  getFollowing
);

export default router;
