import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { SnippetComment, Snippet } from '../models';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, API_CONSTANTS } from '../utils/constants';
import { parsePaginationParams } from '../utils/pagination';
import { logger } from '../utils/logger';
import { notifyOnComment, notifyOnReply } from '../utils/notificationHelper';

/**
 * Comment controller handling snippet comments
 */

/**
 * Add comment to snippet (handles both top-level comments and replies)
 */
export const addComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { id: snippetId } = req.params;
  const { content, parentCommentId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(snippetId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    // Verify snippet exists
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // If parentCommentId is provided, validate it
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {
            message: 'Invalid parent comment ID',
            code: ERROR_CODES.INVALID_INPUT,
          },
        });
      }

      const parentComment = await SnippetComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: {
            message: 'Parent comment not found',
            code: ERROR_CODES.NOT_FOUND,
          },
        });
      }

      if (parentComment.snippetId.toString() !== snippetId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {
            message: 'Parent comment does not belong to this snippet',
            code: ERROR_CODES.INVALID_INPUT,
          },
        });
      }

      // Check nesting depth
      const depth = await SnippetComment.getCommentDepth(parentCommentId);
      if (depth >= API_CONSTANTS.MAX_COMMENT_DEPTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {
            message: `Cannot create replies deeper than ${API_CONSTANTS.MAX_COMMENT_DEPTH} levels`,
            code: ERROR_CODES.INVALID_INPUT,
          },
        });
      }
    }

    // Create comment
    const comment = new SnippetComment({
      snippetId,
      userId: req.user.id,
      userName: req.user.name,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
    });

    await comment.save();

    logger.info(`Comment added to snippet`, {
      commentId: comment._id,
      snippetId,
      userId: req.user.id,
      parentCommentId: parentCommentId || null,
    });

    // Create notification for new comment (only for top-level comments)
    if (!parentCommentId && snippet.userId.toString() !== req.user.id) {
      // Fire and forget - don't wait for notification creation
      notifyOnComment(
        snippetId,
        (comment._id as mongoose.Types.ObjectId).toString(),
        snippet.userId.toString(),
        req.user.id
      ).catch(error => {
        logger.error('Failed to create comment notification:', error);
      });
    }

    return res.status(HTTP_STATUS.CREATED).json({
      message: 'Comment added successfully',
      comment: comment.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to add comment:', error);
    return next(error);
  }
});

/**
 * Get comments for snippet with pagination (supports both flat and threaded)
 */
export const getComments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: snippetId } = req.params;
  const { page, limit } = parsePaginationParams(req);
  const { threaded } = req.query;

  if (!mongoose.Types.ObjectId.isValid(snippetId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    // Verify snippet exists
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // If threaded view is requested, return threaded structure
    if (threaded === 'true') {
      const comments = await SnippetComment.getThreadedComments(snippetId, {
        maxDepth: API_CONSTANTS.MAX_COMMENT_DEPTH,
        sortOrder: 'newest',
        limit: API_CONSTANTS.DEFAULT_THREAD_LIMIT,
      });

      return res.status(HTTP_STATUS.OK).json({
        data: comments,
        threaded: true,
      });
    }

    // Otherwise, return flat structure with pagination
    const result = await SnippetComment.getBySnippetId(snippetId, page, limit);

    return res.status(HTTP_STATUS.OK).json({
      data: result.comments,
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
    logger.error('Failed to get comments:', error);
    return next(error);
  }
});

/**
 * Update comment (owner only)
 */
export const updateComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { id } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid comment ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    const comment = await SnippetComment.findById(id);

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // Check ownership
    if (!comment.isOwnedBy(req.user.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          message: 'You can only update your own comments',
          code: ERROR_CODES.FORBIDDEN,
        },
      });
    }

    // Update comment
    comment.content = content.trim();
    await comment.save();

    logger.info(`Comment updated`, {
      commentId: comment._id,
      userId: req.user.id,
    });

    return res.status(HTTP_STATUS.OK).json({
      message: 'Comment updated successfully',
      comment: comment.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to update comment:', error);
    return next(error);
  }
});

/**
 * Delete comment (owner only)
 */
export const deleteComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid comment ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    const comment = await SnippetComment.findById(id);

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // Check ownership
    if (!comment.isOwnedBy(req.user.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          message: 'You can only delete your own comments',
          code: ERROR_CODES.FORBIDDEN,
        },
      });
    }

    // Recursively delete all nested replies
    const deleteCommentAndReplies = async (commentId: string) => {
      // Find all direct replies to this comment
      const replies = await SnippetComment.find({ parentCommentId: commentId });
      
      // Delete all nested replies recursively
      for (const reply of replies) {
        await deleteCommentAndReplies((reply._id as mongoose.Types.ObjectId).toString());
      }
      
      // Delete the comment itself
      await SnippetComment.findByIdAndDelete(commentId);
    };
    
    await deleteCommentAndReplies(id);

    logger.info(`Comment and nested replies deleted`, {
      commentId: id,
      userId: req.user.id,
    });

    return res.status(HTTP_STATUS.OK).json({
      message: 'Comment and all nested replies deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete comment:', error);
    return next(error);
  }
});

/**
 * Get comment by ID
 */
export const getCommentById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid comment ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    const comment = await SnippetComment.findById(id).populate('userId', 'name email');

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    return res.status(HTTP_STATUS.OK).json({ comment });
  } catch (error) {
    logger.error('Failed to get comment:', error);
    return next(error);
  }
});

/**
 * Get user's comments with pagination
 */
export const getUserComments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { page, limit, skip } = parsePaginationParams(req);

  try {
    const [comments, total] = await Promise.all([
      SnippetComment.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('snippetId', 'title language userName'),
      SnippetComment.countDocuments({ userId: req.user.id }),
    ]);

    return res.status(HTTP_STATUS.OK).json({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Failed to get user comments:', error);
    return next(error);
  }
});

/**
 * Add reply to a comment
 */
export const addReply = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { id: snippetId, commentId: parentCommentId } = req.params;
  const { content } = req.body;

  try {
    // Verify snippet exists
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // Verify parent comment exists and belongs to the snippet
    if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          message: 'Invalid parent comment ID',
          code: ERROR_CODES.INVALID_INPUT,
        },
      });
    }

    const parentComment = await SnippetComment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Parent comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    if (parentComment.snippetId.toString() !== snippetId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          message: 'Parent comment does not belong to this snippet',
          code: ERROR_CODES.INVALID_INPUT,
        },
      });
    }

    // Check nesting depth
    const depth = await SnippetComment.getCommentDepth(parentCommentId);
    if (depth >= API_CONSTANTS.MAX_COMMENT_DEPTH) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          message: `Cannot create replies deeper than ${API_CONSTANTS.MAX_COMMENT_DEPTH} levels`,
          code: ERROR_CODES.INVALID_INPUT,
        },
      });
    }

    // Create reply
    const reply = new SnippetComment({
      snippetId,
      userId: req.user.id,
      userName: req.user.name,
      content: content.trim(),
      parentCommentId,
    });

    await reply.save();

    logger.info(`Reply added to comment`, {
      replyId: reply._id,
      parentCommentId,
      snippetId,
      userId: req.user.id,
    });

    // Create notification for reply
    if (parentComment.userId.toString() !== req.user.id) {
      // Notify parent comment owner
      notifyOnReply(
        parentCommentId,
        (reply._id as mongoose.Types.ObjectId).toString(),
        parentComment.userId.toString(),
        req.user.id
      ).catch(error => {
        logger.error('Failed to create reply notification:', error);
      });
    }

    // Also notify snippet owner if different from parent comment owner
    if (snippet.userId.toString() !== req.user.id && 
        snippet.userId.toString() !== parentComment.userId.toString()) {
      notifyOnComment(
        snippetId,
        (reply._id as mongoose.Types.ObjectId).toString(),
        snippet.userId.toString(),
        req.user.id
      ).catch(error => {
        logger.error('Failed to create snippet owner notification for reply:', error);
      });
    }

    return res.status(HTTP_STATUS.CREATED).json({
      message: 'Reply added successfully',
      comment: reply.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to add reply:', error);
    return next(error);
  }
});

/**
 * Get threaded comments for snippet
 */
export const getThreadedComments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: snippetId } = req.params;
  const { includeReplies = true, maxDepth = API_CONSTANTS.MAX_COMMENT_DEPTH, sortOrder = 'newest' } = req.query;

  if (!mongoose.Types.ObjectId.isValid(snippetId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid snippet ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    // Verify snippet exists
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Snippet not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    const comments = await SnippetComment.getThreadedComments(snippetId, {
      maxDepth: Number(maxDepth),
      sortOrder: sortOrder as 'newest' | 'oldest',
      limit: API_CONSTANTS.DEFAULT_THREAD_LIMIT,
    });

    return res.status(HTTP_STATUS.OK).json({
      data: comments,
      threaded: true,
      includeReplies,
      maxDepth: Number(maxDepth),
      sortOrder,
    });
  } catch (error) {
    logger.error('Failed to get threaded comments:', error);
    return next(error);
  }
});

/**
 * Get direct replies to a comment
 */
export const getReplies = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: commentId } = req.params;
  const { page, limit } = parsePaginationParams(req);

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid comment ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    // Verify parent comment exists
    const parentComment = await SnippetComment.findById(commentId);
    if (!parentComment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    const result = await SnippetComment.getReplies(commentId, page, limit);

    return res.status(HTTP_STATUS.OK).json({
      data: result.replies,
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
    logger.error('Failed to get replies:', error);
    return next(error);
  }
});

/**
 * Get comment thread (comment with all its nested replies)
 */
export const getCommentThread = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        message: 'Invalid comment ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    const comment = await SnippetComment.findById(commentId)
      .populate('userId', 'name email')
      .populate('replyCount');

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Comment not found',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    // Get the full thread for this comment with pagination
    const maxRepliesPerLevel = 50; // Limit replies per level to prevent memory issues
    const populateReplies = async (commentData: any, depth: number): Promise<any> => {
      if (depth >= API_CONSTANTS.MAX_COMMENT_DEPTH) {
        commentData.replies = [];
        commentData.hasMoreReplies = false;
        return commentData;
      }

      // Count total replies
      const totalReplies = await SnippetComment.countDocuments({ parentCommentId: commentData._id });
      
      // Fetch limited replies
      const replies = await SnippetComment.find({ parentCommentId: commentData._id })
        .sort({ createdAt: -1 })
        .limit(maxRepliesPerLevel)
        .populate('userId', 'name email')
        .populate('replyCount')
        .lean();

      commentData.hasMoreReplies = totalReplies > maxRepliesPerLevel;
      commentData.totalReplies = totalReplies;

      if (replies.length > 0) {
        // Recursively populate replies, but limit concurrency
        const populatedReplies = [];
        for (const reply of replies) {
          populatedReplies.push(await populateReplies(reply, depth + 1));
        }
        commentData.replies = populatedReplies;
      } else {
        commentData.replies = [];
      }

      return commentData;
    };

    const threadData = await populateReplies(comment.toObject(), 0);

    return res.status(HTTP_STATUS.OK).json({
      data: threadData,
    });
  } catch (error) {
    logger.error('Failed to get comment thread:', error);
    return next(error);
  }
});
