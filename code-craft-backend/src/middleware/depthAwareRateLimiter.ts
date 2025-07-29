import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { SnippetComment } from '../models';
import { API_CONSTANTS } from '../utils/constants';

/**
 * Creates a depth-aware rate limiter for nested comment replies
 * Reduces allowed rate based on comment depth to prevent abuse
 */
export const createDepthAwareCommentLimiter = () => {
  // Create different rate limiters for different depth levels
  const depthLimiters = new Map<number, any>();
  
  // Create rate limiters for each depth level
  for (let depth = 0; depth <= API_CONSTANTS.MAX_COMMENT_DEPTH; depth++) {
    const maxRequests = Math.max(1, 10 - depth * 2); // Reduce by 2 requests per depth level
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    depthLimiters.set(depth, rateLimit({
      windowMs,
      max: maxRequests,
      message: `Too many replies at depth level ${depth}. Please try again later.`,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        // Use user ID as the key for rate limiting
        return req.user?.id || req.ip || 'anonymous';
      },
    }));
  }
  
  // Middleware function
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId: parentCommentId } = req.params;
      
      if (!parentCommentId) {
        // If no parent comment, use the base rate limiter
        return depthLimiters.get(0)(req, res, next);
      }
      
      // Get the depth of the parent comment
      const depth = await SnippetComment.getCommentDepth(parentCommentId);
      
      // Select appropriate rate limiter based on depth
      const effectiveDepth = Math.min(depth, API_CONSTANTS.MAX_COMMENT_DEPTH);
      const limiter = depthLimiters.get(effectiveDepth) || depthLimiters.get(API_CONSTANTS.MAX_COMMENT_DEPTH);
      
      // Store depth in request for logging
      (req as any).parentCommentDepth = depth;
      
      return limiter(req, res, next);
    } catch (error) {
      // If we can't determine depth, use the strictest rate limiter
      return depthLimiters.get(API_CONSTANTS.MAX_COMMENT_DEPTH)(req, res, next);
    }
  };
};

/**
 * Rate limiter specifically for deeply nested replies
 * More restrictive than regular comment limiter
 */
export const deepReplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Only 3 deeply nested replies per 15 minutes
  message: 'Too many deeply nested replies. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req: Request) => {
    // Skip rate limiting for replies at depth < 3
    try {
      const { commentId: parentCommentId } = req.params;
      if (!parentCommentId) return true;
      
      const depth = await SnippetComment.getCommentDepth(parentCommentId);
      return depth < 3;
    } catch {
      return false;
    }
  },
});
