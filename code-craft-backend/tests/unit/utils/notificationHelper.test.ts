import {
  createNotification,
  createBulkNotifications,
  notifyOnFollow,
  notifyOnComment,
  notifyOnReply,
  notifyOnSnippetCreation
} from '../../../src/utils/notificationHelper';
import { Notification } from '../../../src/models/Notification';
import { logger } from '../../../src/utils/logger';
import mongoose from 'mongoose';
import { API_CONSTANTS } from '../../../src/utils/constants';

// Mock dependencies
jest.mock('../../../src/models/Notification', () => {
  return {
    Notification: {
      createNotification: jest.fn(),
      createBulkNotifications: jest.fn(),
    }
  };
});
jest.mock('../../../src/utils/logger');

describe('Notification Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification()', () => {
    it('should create notification with valid parameters', async () => {
      const mockNotification = { _id: 'test-id', userId: 'user123' };
      (Notification.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await createNotification(
        'user123',
        'follow',
        'Someone followed you',
        { followerId: 'follower123' }
      );

      expect(Notification.createNotification).toHaveBeenCalledWith(
        'user123',
        'follow',
        'Someone followed you',
        { followerId: 'follower123' }
      );
      expect(result).toEqual(mockNotification);
    });

    it('should handle invalid userId gracefully', async () => {
      const result = await createNotification(
        null as any,
        'follow',
        'Test message',
        {}
      );

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid userId')
      );
    });

    it('should handle invalid notification type', async () => {
      const result = await createNotification(
        'user123',
        'invalid-type' as any,
        'Test message',
        {}
      );

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid notification type')
      );
    });

    it('should handle errors without throwing', async () => {
      (Notification.createNotification as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await createNotification(
        'user123',
        'follow',
        'Test message',
        {}
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating notification'),
        expect.any(Error)
      );
    });
  });

  describe('createBulkNotifications()', () => {
    it('should create bulk notifications with valid user IDs', async () => {
      const mockNotifications = [
        { _id: '1', userId: 'user1' },
        { _id: '2', userId: 'user2' }
      ];
      (Notification.createBulkNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await createBulkNotifications(
        ['user1', 'user2'],
        'new_snippet',
        'New snippet posted',
        { snippetId: 'snippet123' }
      );

      expect(Notification.createBulkNotifications).toHaveBeenCalledWith(
        ['user1', 'user2'],
        'new_snippet',
        'New snippet posted',
        { snippetId: 'snippet123' }
      );
      expect(result).toEqual(mockNotifications);
    });

    it('should filter invalid user IDs', async () => {
      const mockNotifications = [{ _id: '1', userId: 'user1' }];
      (Notification.createBulkNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await createBulkNotifications(
        ['user1', null as any, undefined as any, '', 'user2'],
        'new_snippet',
        'New snippet posted',
        {}
      );

      expect(Notification.createBulkNotifications).toHaveBeenCalledWith(
        ['user1', 'user2'],
        'new_snippet',
        'New snippet posted',
        {}
      );
    });

    it('should handle empty user ID array', async () => {
      const result = await createBulkNotifications(
        [],
        'new_snippet',
        'New snippet posted',
        {}
      );

      expect(result).toEqual([]);
      expect(Notification.createBulkNotifications).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (Notification.createBulkNotifications as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await createBulkNotifications(
        ['user1', 'user2'],
        'new_snippet',
        'New snippet posted',
        {}
      );

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating bulk notifications'),
        expect.any(Error)
      );
    });
  });

  describe('notifyOnFollow()', () => {
    it('should create FOLLOW notification', async () => {
      const mockNotification = { _id: 'test-id' };
      (Notification.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await notifyOnFollow('follower123', 'user123');

      expect(Notification.createNotification).toHaveBeenCalledWith(
        'user123',
        'follow',
        expect.any(String),
        expect.objectContaining({ followerId: 'follower123' })
      );
    });

    it('should skip self-follow notifications', async () => {
      await notifyOnFollow('user123', 'user123');

      expect(Notification.createNotification).not.toHaveBeenCalled();
    });

    it('should handle invalid parameters', async () => {
      await notifyOnFollow(null as any, 'user123');
      await notifyOnFollow('follower123', null as any);

      expect(Notification.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyOnComment()', () => {
    it('should create COMMENT notification', async () => {
      const mockNotification = { _id: 'test-id' };
      (Notification.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await notifyOnComment('commenter123', 'author123', 'snippet123');

      expect(Notification.createNotification).toHaveBeenCalledWith(
        'author123',
        'comment',
        expect.any(String),
        expect.objectContaining({
          commenterId: 'commenter123',
          snippetId: 'snippet123'
        })
      );
    });

    it('should skip self-comment notifications', async () => {
      await notifyOnComment('author123', 'author123', 'snippet123');

      expect(Notification.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyOnReply()', () => {
    it('should create REPLY notification', async () => {
      const mockNotification = { _id: 'test-id' };
      (Notification.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await notifyOnReply('replier123', 'author123', 'comment123');

      expect(Notification.createNotification).toHaveBeenCalledWith(
        'author123',
        'reply',
        expect.any(String),
        expect.objectContaining({
          replierId: 'replier123',
          commentId: 'comment123'
        })
      );
    });

    it('should skip self-reply notifications', async () => {
      await notifyOnReply('author123', 'author123', 'comment123');

      expect(Notification.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyOnSnippetCreation()', () => {
    it('should create bulk NEW_SNIPPET notifications', async () => {
      const mockNotifications = [{ _id: '1' }, { _id: '2' }];
      (Notification.createBulkNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      await notifyOnSnippetCreation('author123', ['follower1', 'follower2', 'author123'], 'snippet123');

      expect(Notification.createBulkNotifications).toHaveBeenCalledWith(
        ['follower1', 'follower2'],
        'new_snippet',
        expect.any(String),
        expect.objectContaining({
          authorId: 'author123',
          snippetId: 'snippet123'
        })
      );
    });

    it('should filter out author from followers', async () => {
      await notifyOnSnippetCreation('author123', ['author123'], 'snippet123');

      expect(Notification.createBulkNotifications).toHaveBeenCalledWith(
        [],
        'new_snippet',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle empty follower arrays', async () => {
      await notifyOnSnippetCreation('author123', [], 'snippet123');

      expect(Notification.createBulkNotifications).toHaveBeenCalledWith(
        [],
        'new_snippet',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should validate ObjectId using mongoose', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const invalidId = 'invalid-id';

      jest.spyOn(mongoose.Types.ObjectId, 'isValid');

      await createNotification(validId, 'follow', 'Test', {});
      await createNotification(invalidId, 'follow', 'Test', {});

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(validId);
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(invalidId);
    });

    it('should validate notification types against API_CONSTANTS', async () => {
      const validTypes = Object.values(API_CONSTANTS.NOTIFICATION_TYPES);
      
      for (const type of validTypes) {
        await createNotification('user123', type as any, 'Test', {});
        expect(logger.warn).not.toHaveBeenCalledWith(
          expect.stringContaining(`Invalid notification type: ${type}`)
        );
      }
    });

    it('should log warnings for invalid inputs without throwing', async () => {
      await createNotification(undefined as any, 'follow', 'Test', {});
      await createNotification('user123', undefined as any, 'Test', {});

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should handle all notification functions with null/undefined parameters', async () => {
      const functions = [
        () => notifyOnFollow(null as any, null as any),
        () => notifyOnComment(null as any, null as any, null as any),
        () => notifyOnReply(null as any, null as any, null as any),
        () => notifyOnSnippetCreation(null as any, null as any, null as any),
      ];

      for (const fn of functions) {
        await expect(fn()).resolves.not.toThrow();
      }
    });
  });
});
