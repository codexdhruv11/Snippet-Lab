import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Snippet, SnippetComment, Star, User, Follow } from '../models';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { parsePaginationParams, buildPaginationResponse } from '../utils/pagination';
import { logger } from '../utils/logger';
import { ISnippet } from '../models/Snippet';
import { sanitizeSearchInput, validateObjectId, sanitizePagination, sanitizeRequestBody, sanitizeMongoQuery } from '../utils/sanitization';
import { cache, CACHE_TTL, cacheKeys } from '../utils/cache';
import { notifyOnSnippetCreation } from '../utils/notificationHelper';

/**
 * Snippet controller handling all snippet-related operations
 * Converts Convex functions to REST endpoints with no premium restrictions
 */

/**
 * Create new code snippet
 */
export const createSnippet = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  // Sanitize request body to prevent NoSQL injection
  const sanitizedBody = sanitizeRequestBody(req.body);
  const { title, description, language, code, tags } = sanitizedBody;

  logger.info('Creating snippet', { 
    userId: req.user.id, 
    title: title?.substring(0, 50), 
    language 
  });

  try {
    const snippet = new Snippet({
      userId: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      programmingLanguage: language,
      code,
      userName: req.user.name,
      tags: tags || [],
    });
    
    await snippet.save();

    // Invalidate popular tags cache if snippet has tags
    if (snippet.tags && snippet.tags.length > 0) {
      try {
        // Clear all popular tags cache keys (different limits)
        await Promise.all([
          cache.del(cacheKeys.popularTags(10)),
          cache.del(cacheKeys.popularTags(20)),
          cache.del(cacheKeys.popularTags(50)),
        ]);
        logger.debug('Invalidated popular tags cache after snippet creation');
      } catch (cacheError) {
        // Log but don't fail the request if cache invalidation fails
        logger.warn('Failed to invalidate popular tags cache:', cacheError);
      }
    }

    logger.info(`Snippet created`, {
      snippetId: snippet._id,
      userId: req.user.id,
      language,
      title,
    });

    // Notify followers about new snippet
    // Fire and forget - don't wait for notification creation
    const userId = req.user.id;
    Follow.find({ followingId: userId })
      .select('followerId')
      .lean()
      .then(followers => {
        if (followers.length > 0) {
          const followerIds = followers.map(f => f.followerId.toString());
          return notifyOnSnippetCreation((snippet._id as mongoose.Types.ObjectId).toString(), userId, followerIds);
        }
        return Promise.resolve();
      })
      .catch(error => {
        logger.error('Failed to create snippet notifications:', error);
      });

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Snippet created successfully',
      snippet: snippet.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to create snippet:', error);
    throw error;
  }
});

/**
 * Get all snippets with pagination and optional filtering
 */
export const getSnippets = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePaginationParams(req);
  // Sanitize query parameters to prevent NoSQL injection
  const sanitizedQuery = sanitizeMongoQuery(req.query);
  const { language, search, userId, tags } = sanitizedQuery;

  // Build query
  interface SnippetQuery {
    programmingLanguage?: string;
    userId?: string;
    title?: { $regex: string; $options: string };
    $text?: { $search: string };
    tags?: { $in: string[] };
  }
  
  const query: SnippetQuery = {};

  if (language && typeof language === 'string') {
    query.programmingLanguage = language;
  }

  if (search && typeof search === 'string') {
    const sanitizedSearch = sanitizeSearchInput(search);
    if (sanitizedSearch) {
      query.title = { $regex: sanitizedSearch, $options: 'i' };
    }
  }

  if (userId && typeof userId === 'string') {
    const validUserId = validateObjectId(userId);
    if (validUserId) {
      query.userId = validUserId;
    }
  }

  // Add tag filtering if tags are provided
  if (tags && Array.isArray(tags) && tags.length > 0) {
    // Filter out any empty strings that might have passed sanitization
    const validTags = tags.filter(tag => tag && tag.trim().length > 0);
    if (validTags.length > 0) {
      query.tags = { $in: validTags };
      logger.info('Filtering snippets by tags:', validTags);
    } else {
      // If all tags are invalid after filtering, just ignore them and continue
      // This is more user-friendly than returning an error
      logger.warn('All provided tags were invalid after filtering, ignoring tag filter:', tags);
    }
  }

  try {
    // Get snippets with pagination using lean() for better performance
    const [snippets, total] = await Promise.all([
      Snippet.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .populate('starCount')
        .populate('commentCount'),
      Snippet.countDocuments(query),
    ]);

    const response = buildPaginationResponse(snippets, total, page, limit);

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error('Failed to get snippets:', error);
    throw error;
  }
});

/**
 * Get specific snippet by ID
 */
export const getSnippetById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
    return;
  }

  try {
    const snippet = await Snippet.findById(id)
      .populate('starCount')
      .populate('commentCount');

    if (!snippet) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
      return;
    }

    // Check if current user has starred this snippet
    let isStarred = false;
    if (req.user) {
      const snippetDoc = snippet as ISnippet & { _id: mongoose.Types.ObjectId };
      isStarred = await Star.isStarredBy(req.user.id, snippetDoc._id.toString());
    }

    res.status(HTTP_STATUS.OK).json({
      snippet: {
        ...snippet.toJSON(),
        isStarred,
      },
    });
  } catch (error) {
    logger.error('Failed to get snippet:', error);
    throw error;
  }
});

/**
 * Update snippet (owner only)
 */
export const updateSnippet = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { id } = req.params;
  // Sanitize request body to prevent NoSQL injection
  const sanitizedBody = sanitizeRequestBody(req.body);
  const { title, description, language, code, tags } = sanitizedBody;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
    return;
  }

  try {
    const snippet = await Snippet.findById(id);

    if (!snippet) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
      return;
    }

    // Check ownership
    if (!snippet.isOwnedBy(req.user.id)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          message: 'You can only update your own snippets',
          code: ERROR_CODES.FORBIDDEN,
        },
      });
      return;
    }

    // Update fields if provided
    if (title !== undefined) {
      snippet.title = title.trim();
    }
    if (description !== undefined) {
      snippet.description = description ? description.trim() : undefined;
    }
    if (language !== undefined) {
      snippet.programmingLanguage = language;
    }
    if (code !== undefined) {
      snippet.code = code;
    }
    if (tags !== undefined) {
      snippet.tags = tags;
    }

    await snippet.save();

    // Invalidate popular tags cache if tags were updated
    if (tags !== undefined) {
      try {
        // Clear all popular tags cache keys (different limits)
        await Promise.all([
          cache.del(cacheKeys.popularTags(10)),
          cache.del(cacheKeys.popularTags(20)),
          cache.del(cacheKeys.popularTags(50)),
        ]);
        logger.debug('Invalidated popular tags cache after snippet update');
      } catch (cacheError) {
        // Log but don't fail the request if cache invalidation fails
        logger.warn('Failed to invalidate popular tags cache:', cacheError);
      }
    }

    logger.info(`Snippet updated`, {
      snippetId: snippet._id,
      userId: req.user.id,
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Snippet updated successfully',
      snippet: snippet.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to update snippet:', error);
    throw error;
  }
});

/**
 * Delete snippet with cascade delete of comments and stars
 */
export const deleteSnippet = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
    return;
  }

  try {
    const snippet = await Snippet.findById(id);

    if (!snippet) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
      return;
    }

    // Check ownership
    if (!snippet.isOwnedBy(req.user.id)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          message: 'You can only delete your own snippets',
          code: ERROR_CODES.FORBIDDEN,
        },
      });
      return;
    }

    // Use transaction for cascade deletion
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Delete associated comments
        await SnippetComment.deleteMany({ snippetId: id }).session(session);
        
        // Delete associated stars
        await Star.deleteMany({ snippetId: id }).session(session);
        
        // Delete the snippet
        await Snippet.findByIdAndDelete(id).session(session);
      });

      logger.info(`Snippet deleted with cascade`, {
        snippetId: id,
        userId: req.user.id,
      });

      res.status(HTTP_STATUS.OK).json({
        message: 'Snippet deleted successfully',
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error('Failed to delete snippet:', error);
    throw error;
  }
});

/**
 * Get user's starred snippets
 */
export const getStarredSnippets = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { page, limit } = parsePaginationParams(req);

  try {
    const result = await Star.getUserStarredSnippets(req.user.id, page, limit);

    res.status(HTTP_STATUS.OK).json({
      data: result.snippets,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    });
  } catch (error) {
    logger.error('Failed to get starred snippets:', error);
    throw error;
  }
});

/**
 * Get snippets by user ID (public)
 */
export const getSnippetsByUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { page, limit, skip } = parsePaginationParams(req);

  // Validate user exists
  let user;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId);
  } else {
    user = null;
  }

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
    const [snippets, total] = await Promise.all([
      Snippet.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('starCount')
        .populate('commentCount'),
      Snippet.countDocuments({ userId: user._id }),
    ]);

    const response = buildPaginationResponse(snippets, total, page, limit);

    res.status(HTTP_STATUS.OK).json({
      ...response,
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error('Failed to get user snippets:', error);
    throw error;
  }
});

/**
 * Get popular tags with usage counts
 */
export const getPopularTags = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { limit = 20 } = parsePaginationParams(req);
  const cacheKey = cacheKeys.popularTags(limit);
  
  // Attempt to get cached popular tags
  const cachedTags = await cache.get(cacheKey);
  if (cachedTags && Array.isArray(cachedTags)) {
    res.status(HTTP_STATUS.OK).json({
      data: cachedTags,
      total: cachedTags.length,
    });
    return;
  }

  try {
    // Use aggregation to get tag counts
    const popularTags = await Snippet.aggregate([
      // Match documents that have tags (optimization)
      { $match: { tags: { $exists: true, $ne: [] } } },
      // Unwind the tags array to create a document for each tag
      { $unwind: '$tags' },
      // Group by tag and count occurrences
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      // Sort by count descending
      { $sort: { count: -1 } },
      // Limit results
      { $limit: limit },
      // Reshape the output
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1,
        },
      },
    ]).allowDiskUse(true);

    // Cache the results
    await cache.set(cacheKey, popularTags, CACHE_TTL.POPULAR_TAGS);

    if (popularTags.length === 0) {
      logger.info('No popular tags found');
      res.status(HTTP_STATUS.OK).json({
        message: 'No popular tags available',
        data: [],
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      data: popularTags,
      total: popularTags.length,
    });
  } catch (error) {
    // Handle specific aggregation errors
    if (error instanceof Error) {
      if (error.message.includes('memory limit') || error.message.includes('allowDiskUse')) {
        logger.error('Aggregation pipeline exceeded memory limit:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {
            message: 'Unable to calculate popular tags due to resource constraints',
            code: ERROR_CODES.INTERNAL_ERROR,
          },
        });
        return;
      }
      if (error.message.includes('pipeline')) {
        logger.error('Invalid aggregation pipeline:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {
            message: 'Error processing tag statistics',
            code: ERROR_CODES.INTERNAL_ERROR,
          },
        });
        return;
      }
    }
    
    logger.error('Failed to get popular tags:', error);
    throw error;
  }
});

/**
 * Get feed snippets from users that the authenticated user follows
 */
export const getFeedSnippets = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
    return;
  }

  const { page, limit, skip } = parsePaginationParams(req);

  try {
    // Get all user IDs that the current user follows
    const followedUsers = await Follow.find({ followerId: req.user.id })
      .select('followingId')
      .lean();

    // Handle case where user follows no one
    if (followedUsers.length === 0) {
      const response = buildPaginationResponse([], 0, page, limit);
      res.status(HTTP_STATUS.OK).json({
        ...response,
        message: 'Follow some users to see their snippets in your feed',
      });
      return;
    }

    // Extract followed user IDs
    const followedUserIds = followedUsers.map(follow => follow.followingId);

    // Optimize: First check which followed users actually have snippets
    const usersWithSnippets = await Snippet.distinct('userId', { 
      userId: { $in: followedUserIds } 
    });

    // If no followed users have snippets, return early
    if (usersWithSnippets.length === 0) {
      const response = buildPaginationResponse([], 0, page, limit);
      res.status(HTTP_STATUS.OK).json({
        ...response,
        message: 'No snippets available from users you follow',
      });
      return;
    }

    // Query snippets only from users who have them
    const [snippets, total] = await Promise.all([
      Snippet.find({ userId: { $in: usersWithSnippets } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('starCount')
        .populate('commentCount')
        .lean(),
      Snippet.countDocuments({ userId: { $in: usersWithSnippets } }),
    ]);

    // Optimize: Get all starred snippet IDs for the current user in a single query
    const starredSnippetIds = await Star.find({
      userId: req.user.id,
      snippetId: { $in: snippets.map(s => s._id) },
    })
      .select('snippetId')
      .lean()
      .then(stars => new Set(stars.map(s => s.snippetId.toString())));

    // Map starred status to snippets without N+1 queries
    const enrichedSnippets = snippets.map(snippet => ({
      ...snippet,
      isStarred: starredSnippetIds.has(snippet._id.toString()),
    }));

    const response = buildPaginationResponse(enrichedSnippets, total, page, limit);

    logger.info(`Feed retrieved for user ${req.user.id}: ${total} snippets from ${followedUserIds.length} followed users`);

    res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error('Failed to get feed snippets:', error);
    throw error;
  }
});
