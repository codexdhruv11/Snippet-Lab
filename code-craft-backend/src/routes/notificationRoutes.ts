import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';
import { notificationLimiter, generalLimiter } from '../middleware/rateLimiting';
import {
  validatePagination,
  validateNotificationFetch,
  validateMarkAsRead,
  validateObjectId,
} from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @access  Private
 */
router.get(
  '/',
  requireAuth,
  validateNotificationFetch,
  validatePagination,
  notificationLimiter,
  getNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get(
  '/unread-count',
  requireAuth,
  generalLimiter,
  getUnreadCount
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  requireAuth,
  validateMarkAsRead,
  generalLimiter,
  markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Private
 */
router.patch(
  '/read-all',
  requireAuth,
  generalLimiter,
  markAllAsRead
);

export default router;
