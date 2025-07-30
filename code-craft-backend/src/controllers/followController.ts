import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { FollowModel, UserModel } from '../models';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';
import { FollowError } from '../models/Follow';
import { notifyOnFollow } from '../utils/notificationHelper';

// Helper function to transform FollowError to AppError
const transformFollowError = (error: any): AppError => {
  if (error instanceof FollowError) {
    logger.debug(`FollowError transformed - message: ${error.message}, code: ${error.code}`);
    return new AppError(error.message, error.statusCode, error.code);
  }
  if (error.name === 'MongoServerError' && error.code === 11000) {
    logger.debug('Duplicate key error in follow operation');
    return new AppError('Follow relationship already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }
  return error;
};

// Helper function to validate user existence and ObjectId format
const validateUserExists = async (userId: string): Promise<IUser> => {
  // Validate ObjectId format
  if (!userId || typeof userId !== 'string') {
    throw new AppError('Invalid user ID: ID must be provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError(`Invalid user ID format: ${userId}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(`User not found with ID: ${userId}`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return user;
};

// Toggle follow/unfollow
export const toggleFollow = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: targetUserId } = req.params;
    const followerId = req.user!.id;
    const startTime = Date.now();

    // Log incoming request
    logger.debug(`Follow toggle request - followerId: ${followerId}, targetUserId: ${targetUserId}`);

    // Prevent self-following
    if (followerId === targetUserId) {
      logger.warn(`Self-follow attempt - userId: ${followerId}`);
      return next(
        new AppError('Cannot follow yourself', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR)
      );
    }

    // Validate target user exists
    try {
      await validateUserExists(targetUserId);
    } catch (error) {
      logger.error(`User validation failed - targetUserId: ${targetUserId}, error: ${error.message}`);
      throw error;
    }

    // Toggle follow
    try {
      const result = await FollowModel.toggle(followerId, targetUserId);
      const duration = Date.now() - startTime;

      logger.info(`User ${followerId} ${result.isFollowing ? 'followed' : 'unfollowed'} user ${targetUserId} - duration: ${duration}ms`);

      // Create notification for new follow
      if (result.isFollowing) {
        // Fire and forget - don't wait for notification creation
        notifyOnFollow(followerId, targetUserId).catch(error => {
          logger.error('Failed to create follow notification:', error);
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.isFollowing ? 'User followed successfully' : 'User unfollowed successfully',
        isFollowing: result.isFollowing,
        followerCount: result.followerCount,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown',
      });
    } catch (error) {
      logger.error(`Follow toggle failed - followerId: ${followerId}, targetUserId: ${targetUserId}, error: ${error.message}`);
      throw transformFollowError(error);
    }
  }
);

// Get follower count for a user
export const getFollowerCount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.params;

    // Validate user exists
    await validateUserExists(userId);

    try {
      const count = await FollowModel.getFollowerCount(userId);

      res.status(HTTP_STATUS.OK).json({
        count,
      });
    } catch (error) {
      throw transformFollowError(error);
    }
  }
);

// Get following count for a user
export const getFollowingCount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.params;

    // Validate user exists
    await validateUserExists(userId);

    try {
      const count = await FollowModel.getFollowingCount(userId);

      res.status(HTTP_STATUS.OK).json({
        count,
      });
    } catch (error) {
      throw transformFollowError(error);
    }
  }
);

// Validate pagination parameters with tiered limits
const validatePagination = (page: number, limit: number, isAuthenticated: boolean = true) => {
  // Define max limits based on authentication status
  const MAX_LIMIT_AUTHENTICATED = 50;  // Authenticated users can fetch up to 50 items
  const MAX_LIMIT_UNAUTHENTICATED = 20; // Unauthenticated users limited to 20 items
  const DEFAULT_LIMIT = 20;
  
  // Determine the appropriate max limit
  const maxLimit = isAuthenticated ? MAX_LIMIT_AUTHENTICATED : MAX_LIMIT_UNAUTHENTICATED;
  
  // Ensure values are numbers and within valid ranges
  const validPage = isNaN(page) || page < 1 ? 1 : Math.floor(page);
  const validLimit = isNaN(limit) || limit < 1 ? DEFAULT_LIMIT : Math.min(Math.floor(limit), maxLimit);
  
  return {
    isValid: true, // Always valid after sanitization
    page: validPage,
    limit: validLimit,
    maxLimit, // Return the max limit for transparency
  };
};

// Get paginated list of followers
export const getFollowers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.params;
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;

    // Check if user is authenticated (optionalAuth middleware sets req.user)
    const isAuthenticated = !!req.user;
    const { page: validPage, limit: validLimit, maxLimit } = validatePagination(page, limit, isAuthenticated);

    // Validate user exists
    await validateUserExists(userId);

    try {
      const result = await FollowModel.getFollowers(userId, validPage, validLimit);

      res.status(HTTP_STATUS.OK).json({
        followers: result.followers,
        pagination: {
          ...result.pagination,
          maxLimit, // Include max limit in response for transparency
        },
      });
    } catch (error) {
      throw transformFollowError(error);
    }
  }
);

// Get paginated list of users being followed
export const getFollowing = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.params;
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;

    // Check if user is authenticated (optionalAuth middleware sets req.user)
    const isAuthenticated = !!req.user;
    const { page: validPage, limit: validLimit, maxLimit } = validatePagination(page, limit, isAuthenticated);

    // Validate user exists
    await validateUserExists(userId);

    try {
      const result = await FollowModel.getFollowing(userId, validPage, validLimit);

      res.status(HTTP_STATUS.OK).json({
        following: result.following,
        pagination: {
          ...result.pagination,
          maxLimit, // Include max limit in response for transparency
        },
      });
    } catch (error) {
      throw transformFollowError(error);
    }
  }
);

// Check if current user follows target user
export const isFollowing = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: targetUserId } = req.params;
    const followerId = req.user!.id;

    // Validate target user exists (optional - checking if following)
    // Since this is just checking if following, we could skip validation
    // but for consistency with other endpoints, we validate
    await validateUserExists(targetUserId);

    try {
      const isFollowing = await FollowModel.isFollowing(followerId, targetUserId);

      res.status(HTTP_STATUS.OK).json({
        isFollowing,
      });
    } catch (error) {
      throw transformFollowError(error);
    }
  }
);
