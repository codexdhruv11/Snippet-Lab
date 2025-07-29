import { Notification } from '../models';
import { API_CONSTANTS } from './constants';
import { logger } from './logger';
import mongoose from 'mongoose';

/**
 * Create a single notification
 */
export const createNotification = async (
  userId: string,
  type: keyof typeof API_CONSTANTS.NOTIFICATION_TYPES,
  data: Record<string, any>
): Promise<void> => {
  // Validate userId
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    logger.warn(`Invalid userId for notification: ${userId}`);
    return;
  }

  // Validate type
  if (!Object.values(API_CONSTANTS.NOTIFICATION_TYPES).includes(type)) {
    logger.warn(`Invalid notification type: ${type}`);
    return;
  }

  try {
    await Notification.createNotification(userId, type, data);
    logger.info(`Notification created for user ${userId}`, { type, data });
  } catch (error) {
    logger.error('Failed to create notification:', error);
    // Don't throw - notifications should not break main functionality
  }
};

/**
 * Create bulk notifications for multiple users
 */
export const createBulkNotifications = async (
  userIds: string[],
  type: keyof typeof API_CONSTANTS.NOTIFICATION_TYPES,
  data: Record<string, any>
): Promise<void> => {
  if (!userIds || userIds.length === 0) return;
  
  // Filter out invalid user IDs
  const validUserIds = userIds.filter(id => 
    id && mongoose.Types.ObjectId.isValid(id)
  );
  
  if (validUserIds.length === 0) {
    logger.warn('No valid user IDs provided for bulk notifications');
    return;
  }
  
  // Validate type
  if (!Object.values(API_CONSTANTS.NOTIFICATION_TYPES).includes(type)) {
    logger.warn(`Invalid notification type for bulk: ${type}`);
    return;
  }
  
  try {
    await Notification.createBulkNotifications(validUserIds, type, data);
    logger.info(`Bulk notifications created for ${validUserIds.length} users`, { type, data });
    
    if (validUserIds.length < userIds.length) {
      logger.warn(`${userIds.length - validUserIds.length} invalid user IDs were filtered out`);
    }
  } catch (error) {
    logger.error('Failed to create bulk notifications:', error);
    // Don't throw - notifications should not break main functionality
  }
};

/**
 * Create notification for new follow
 */
export const notifyOnFollow = async (
  followerId: string,
  followingId: string
): Promise<void> => {
  // Don't notify user of their own actions
  if (followerId === followingId) return;
  
  await createNotification(
    followingId,
    'FOLLOW',
    { followerId }
  );
};

/**
 * Create notification for new comment on snippet
 */
export const notifyOnComment = async (
  snippetId: string,
  commentId: string,
  snippetOwnerId: string,
  commenterId: string
): Promise<void> => {
  // Don't notify user of their own actions
  if (snippetOwnerId === commenterId) return;
  
  await createNotification(
    snippetOwnerId,
    'COMMENT',
    { snippetId, commentId, commenterId }
  );
};

/**
 * Create notification for reply to comment
 */
export const notifyOnReply = async (
  parentCommentId: string,
  replyId: string,
  parentCommentOwnerId: string,
  replierId: string
): Promise<void> => {
  // Don't notify user of their own actions
  if (parentCommentOwnerId === replierId) return;
  
  await createNotification(
    parentCommentOwnerId,
    'REPLY',
    { parentCommentId, replyId, replierId }
  );
};

/**
 * Create notifications for new snippet creation
 */
export const notifyOnSnippetCreation = async (
  snippetId: string,
  authorId: string,
  followerIds: string[]
): Promise<void> => {
  // Filter out the author from followers (shouldn't happen, but just in case)
  const filteredFollowerIds = followerIds.filter(id => id !== authorId);
  
  if (filteredFollowerIds.length === 0) return;
  
  await createBulkNotifications(
    filteredFollowerIds,
    'NEW_SNIPPET',
    { snippetId, authorId }
  );
};
