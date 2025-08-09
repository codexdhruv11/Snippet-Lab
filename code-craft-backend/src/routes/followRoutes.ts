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

const router = Router();

// For follow operations, we'll use the general limiter
// Follow operations are less frequent than comments/snippets

// Toggle follow/unfollow - requires authentication
router.post(
  '/:id/follows',
  requireAuth,
  validateObjectId('id'),
  toggleFollow
);

// Get follower count - public endpoint
router.get(
  '/:id/followers/count',
  validateObjectId('id'),
  getFollowerCount
);

// Get following count - public endpoint
router.get(
  '/:id/following/count',
  validateObjectId('id'),
  getFollowingCount
);

// Check if current user follows target user - requires authentication
router.get(
  '/:id/follows/me',
  requireAuth,
  validateObjectId('id'),
  isFollowing
);

// Get paginated list of followers - optional authentication
router.get(
  '/:id/followers',
  optionalAuth,
  validateObjectId('id'),
  getFollowers
);

// Get paginated list of following - optional authentication
router.get(
  '/:id/following',
  optionalAuth,
  validateObjectId('id'),
  getFollowing
);

export default router;
