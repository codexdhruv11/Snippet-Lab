import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models';
import { catchAsync } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, API_CONSTANTS } from '../utils/constants';
import { parsePaginationParams } from '../utils/pagination';
import { logger } from '../utils/logger';

/**
 * Get user's notifications with pagination
 */
export const getNotifications = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  const { page, limit } = parsePaginationParams(req);
  const { unreadOnly } = req.query;

  try {
    const result = await Notification.getUserNotifications(
      req.user.id,
      page,
      limit,
      unreadOnly === 'true'
    );

    logger.info(`Notifications retrieved for user ${req.user.id}`, {
      page,
      limit,
      unreadOnly: unreadOnly === 'true',
      total: result.total,
    });

    return res.status(HTTP_STATUS.OK).json({
      data: result.notifications,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    });
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    return next(error);
  }
});

/**
 * Mark a specific notification as read
 */
export const markAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
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
        message: 'Invalid notification ID',
        code: ERROR_CODES.INVALID_INPUT,
      },
    });
  }

  try {
    const updated = await Notification.markAsRead(id, req.user.id);

    if (!updated) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          message: 'Notification not found or already read',
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    }

    logger.info(`Notification marked as read`, {
      notificationId: id,
      userId: req.user.id,
    });

    return res.status(HTTP_STATUS.OK).json({
      message: 'Notification marked as read successfully',
    });
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    return next(error);
  }
});

/**
 * Mark all user's notifications as read
 */
export const markAllAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  try {
    const count = await Notification.markAllAsRead(req.user.id);

    logger.info(`All notifications marked as read for user ${req.user.id}`, {
      count,
    });

    return res.status(HTTP_STATUS.OK).json({
      message: 'All notifications marked as read successfully',
      count,
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    return next(error);
  }
});

/**
 * Get unread notification count
 */
export const getUnreadCount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        message: 'User not authenticated',
        code: ERROR_CODES.UNAUTHORIZED,
      },
    });
  }

  try {
    const count = await Notification.getUnreadCount(req.user.id);

    return res.status(HTTP_STATUS.OK).json({
      count,
    });
  } catch (error) {
    logger.error('Failed to get unread notification count:', error);
    return next(error);
  }
});
