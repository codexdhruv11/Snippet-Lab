import { Request, Response } from 'express';
import { User, CodeExecution, Star, Snippet } from '../models';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';
import { validateObjectId, sanitizeSearchInput } from '../utils/sanitization';
import { clearAuthCookie } from '../utils/cookies';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { getUsersWithFollowCounts } from '../utils/userAggregations';

/**
 * User controller handling user-related operations
 * Removes all premium features - no isPro checks or upgradeToPro functionality
 */


/**
 * Get current authenticated user profile
 */
export const getCurrentUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const user = await User.findById(req.user.id).lean();

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {
        message: 'User not found',
        code: ERROR_CODES.NOT_FOUND,
      },
    });
    return;
  }

  // Remove password field from response
  const { password, ...userWithoutPassword } = user;

  res.status(HTTP_STATUS.OK).json({
    user: userWithoutPassword,
  });
});

/**
 * Update user profile information
 */
export const updateUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { name, email, bio } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {
        message: 'User not found',
        code: ERROR_CODES.NOT_FOUND,
      },
    });
    return;
  }

  // Update fields if provided
  if (name !== undefined) {
    user.name = name;
  }
  if (email !== undefined) {
    user.email = email;
  }
  if (bio !== undefined) {
    user.bio = bio;
  }

  await user.save();

  logger.info(`User profile updated: ${user._id}`, { name, email, bio: bio ? 'updated' : 'unchanged' });

  res.status(HTTP_STATUS.OK).json({
    message: 'User profile updated successfully',
    user: user.toJSON(),
  });
});

/**
 * Get user statistics including execution history and starred snippets
 */
export const getUserStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id: userId } = req.params;

  // Validate user ID
  const validUserId = validateObjectId(userId);
  if (!validUserId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid user ID format',
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    });
    return;
  }

  // Find user by MongoDB ObjectId using lean() for better performance
  const user = await User.findById(validUserId).lean();

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {
        message: 'User not found',
        code: ERROR_CODES.NOT_FOUND,
      },
    });
    return;
  }

  try {
    // Use aggregation pipeline for better performance instead of multiple queries
    const [executionStats, languageStats, starredCount] = await Promise.all([
      CodeExecution.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            totalExecutions: { $sum: 1 },
            avgExecutionTime: { $avg: '$executionTime' },
            languagesUsed: { $addToSet: '$language' },
            last24Hours: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      CodeExecution.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Star.countDocuments({ userId: user._id })
    ]);

    const favoriteLanguage = languageStats.length > 0 ? languageStats[0]._id : null;
    const stats = executionStats[0] || {
      totalExecutions: 0,
      avgExecutionTime: 0,
      languagesUsed: [],
      last24Hours: 0
    };

    // Get recent executions with lean() for better performance
    const recentExecutions = await CodeExecution.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const userStats = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      executions: {
        total: stats.totalExecutions,
        languagesUsed: stats.languagesUsed?.length || 0,
        favoriteLanguage,
        avgExecutionTime: Math.round(stats.avgExecutionTime || 0),
        last24Hours: stats.last24Hours,
        recent: recentExecutions,
      },
      snippets: {
        starred: starredCount,
      },
    };

    res.status(HTTP_STATUS.OK).json({ stats: userStats });
  } catch (error) {
    logger.error('Failed to get user stats:', error);
    throw error;
  }
});

/**
 * Get user's public profile with enhanced information
 */
export const getUserProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id: userId } = req.params;

  // Validate user ID
  const validUserId = validateObjectId(userId);
  if (!validUserId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid user ID format',
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    });
    return;
  }

  try {
    // Get user with follower/following counts using aggregation
    const userWithCounts = await User.getUserWithFollows(validUserId);

    if (!userWithCounts) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'User not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
      return;
    }

    // Get recent snippets
    const recentSnippets = await Snippet.find({ userId: validUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title description programmingLanguage createdAt tags')
      .populate('starCount')
      .populate('commentCount')
      .lean();

    // Get recent executions
    const recentExecutions = await CodeExecution.find({ userId: validUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('language executionTime output error createdAt')
      .lean();

    // Structure the enhanced profile response
    const enhancedProfile = {
      user: {
        id: userWithCounts._id,
        name: userWithCounts.name,
        bio: userWithCounts.bio || null,
        createdAt: userWithCounts.createdAt,
        followerCount: userWithCounts.followerCount || 0,
        followingCount: userWithCounts.followingCount || 0,
      },
      recentActivity: {
        snippets: recentSnippets,
        executions: recentExecutions,
      },
    };

    logger.info(`Enhanced profile retrieved for user: ${validUserId}`);

    res.status(HTTP_STATUS.OK).json(enhancedProfile);
  } catch (error) {
    logger.error('Failed to get user profile:', error);
    throw error;
  }
});

/**
 * Change user password
 */
export const changePassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  
  // Get user with password field
  const user = await User.findById(req.user.id).select('+password +sessionTokens');
  
  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {
        message: 'User not found',
        code: ERROR_CODES.NOT_FOUND,
      },
    });
    return;
  }
  
  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isPasswordValid) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'Current password is incorrect',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }
  
  // Update password (this will trigger the pre-save hook to hash it and invalidate sessions)
  user.password = newPassword;
  await user.save();
  
  // Clear auth cookie to force re-login
  clearAuthCookie(res);
  
  logger.info(`Password changed for user: ${user.email}`);
  
  res.status(HTTP_STATUS.OK).json({
    message: 'Password changed successfully. Please login again with your new password.',
  });
});

/**
 * Search users by name
 */
export const searchUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { q: searchQuery } = req.query;
  const { page, limit, skip } = parsePaginationParams(req);

  // Sanitize search input
  const sanitizedQuery = sanitizeSearchInput(searchQuery as string);

  if (!sanitizedQuery) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Search query is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    });
    return;
  }

  try {
    // Try to use text search first for better performance
    let query: any;
    let users: any[];
    let total: number;

    try {
      // Use MongoDB text search for better performance with text index
      query = { $text: { $search: sanitizedQuery } };
      
      [users, total] = await Promise.all([
        User.find(query, { score: { $meta: 'textScore' } })
          .select('name bio createdAt')
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);
    } catch (textSearchError) {
      // Fallback to regex search if text index is not available
      logger.warn('Text search failed, falling back to regex search:', textSearchError);
      
      const searchRegex = new RegExp(sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query = { name: { $regex: searchRegex } };
      
      [users, total] = await Promise.all([
        User.find(query)
          .select('name bio createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);
    }

    // Return consistent structure for both authenticated and unauthenticated users
    let enrichedUsers;
    if (req.user && users.length > 0) {
      // For authenticated users, use single aggregation to get all users with counts
      const userIds = users.map(u => u._id);
      const usersWithCounts = await User.aggregate(getUsersWithFollowCounts(userIds));
      
      // Create a map for quick lookup
      const userCountsMap = new Map(usersWithCounts.map(u => [u._id.toString(), u]));
      
      // Map original search results with counts
      enrichedUsers = users.map(user => {
        const userWithCounts = userCountsMap.get(user._id.toString());
        return {
          id: user._id,
          name: user.name,
          bio: user.bio || null,
          createdAt: user.createdAt,
          followerCount: userWithCounts?.followerCount || 0,
          followingCount: userWithCounts?.followingCount || 0,
        };
      });
    } else {
      // For unauthenticated users, return same structure with 0 counts
      enrichedUsers = users.map(user => ({
        id: user._id,
        name: user.name,
        bio: user.bio || null,
        createdAt: user.createdAt,
        followerCount: 0,
        followingCount: 0,
      }));
    }

    const response = buildPaginationResponse(enrichedUsers, total, page, limit);

    logger.info(`User search performed: query="${sanitizedQuery}", results=${total}`);

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error('Failed to search users:', error);
    throw error;
  }
});

/**
 * Get user's contribution graph data for visualization
 * Returns daily snippet creation counts for a specified date range (default: past 365 days)
 */
export const getContributionGraph = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id: userId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate user ID
  const validUserId = validateObjectId(userId);
  if (!validUserId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid user ID format',
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    });
    return;
  }

  // Verify user exists
  const user = await User.findById(validUserId).lean();
  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {
        message: 'User not found',
        code: ERROR_CODES.NOT_FOUND,
      },
    });
    return;
  }

  try {
    // Parse date range (default: past 365 days)
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Set times to start/end of day for consistency
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    logger.info(`Fetching contribution graph for user ${validUserId} from ${start.toISOString()} to ${end.toISOString()}`);

    // Aggregation pipeline to get daily snippet counts
    const contributionData = await Snippet.aggregate([
      {
        $match: {
          userId: validUserId,
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Create a map for quick lookup
    const contributionMap = new Map(
      contributionData.map(item => [item._id, item.count])
    );

    // Generate complete date range with zero-filled missing dates
    const contributions = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      contributions.push({
        date: dateStr,
        count: contributionMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logger.info(`Contribution graph generated for user ${validUserId}: ${contributions.length} days, ${contributionData.length} active days`);

    res.status(HTTP_STATUS.OK).json({
      data: contributions,
      meta: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalDays: contributions.length,
        activeDays: contributionData.length,
        totalContributions: contributions.reduce((sum, day) => sum + day.count, 0),
      },
    });
  } catch (error) {
    logger.error('Failed to get contribution graph:', error);
    throw error;
  }
});
