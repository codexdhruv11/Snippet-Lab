import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import { API_CONSTANTS } from '../utils/constants';
import DOMPurify from 'isomorphic-dompurify';

const purify = DOMPurify;

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: keyof typeof API_CONSTANTS.NOTIFICATION_TYPES;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationStatics extends Model<INotification> {
  createNotification(userId: string, type: keyof typeof API_CONSTANTS.NOTIFICATION_TYPES, data: Record<string, any>): Promise<INotification>;
  createBulkNotifications(userIds: string[], type: keyof typeof API_CONSTANTS.NOTIFICATION_TYPES, data: Record<string, any>): Promise<void>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
  getUserNotifications(
    userId: string, 
    page: number, 
    limit: number, 
    unreadOnly?: boolean
  ): Promise<{ 
    notifications: INotification[], 
    total: number, 
    page: number, 
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }>;
  cleanupOldNotifications(): Promise<number>;
}

const notificationSchema = new Schema<INotification, INotificationStatics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(API_CONSTANTS.NOTIFICATION_TYPES),
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      validate: [(val: any) => JSON.stringify(val).length <= API_CONSTANTS.NOTIFICATION_DATA_MAX_SIZE, 'Data size too large'],
      set: function(val: any) {
        if (!val || typeof val !== 'object') return val;
        
        // Deep clone to avoid modifying original
        const sanitized = JSON.parse(JSON.stringify(val));
        
        // Recursively sanitize all string values
        const sanitizeObject = (obj: any): any => {
          for (const key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = purify.sanitize(obj[key], {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: [],
              });
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              sanitizeObject(obj[key]);
            }
          }
          return obj;
        };
        
        return sanitizeObject(sanitized);
      },
    },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
// TTL index for automatic cleanup of old notifications
notificationSchema.index(
  { createdAt: 1 }, 
  { 
    expireAfterSeconds: API_CONSTANTS.MAX_NOTIFICATION_AGE_DAYS * 24 * 60 * 60 
  }
);

notificationSchema.statics.createNotification = async function (userId, type, data) {
  return this.create({ userId, type, data });
};

notificationSchema.statics.createBulkNotifications = async function (userIds, type, data) {
  const notifications = userIds.map((userId: string) => ({ userId, type, data }));
  
  try {
    // Use ordered: false to continue inserting valid documents even if some fail
    await this.insertMany(notifications, { ordered: false });
  } catch (error: any) {
    // If it's a BulkWriteError, some notifications may have been created successfully
    if (error.name === 'BulkWriteError' && error.insertedDocs) {
      // Log the error but don't throw - partial success is acceptable
      const successCount = error.insertedDocs.length;
      const failureCount = notifications.length - successCount;
      console.error(`Bulk notification creation partial failure: ${successCount} succeeded, ${failureCount} failed`);
    } else {
      // For other errors, throw them up
      throw error;
    }
  }
};

notificationSchema.statics.markAsRead = async function (notificationId, userId) {
  const result = await this.updateOne(
    { _id: notificationId, userId, isRead: false }, 
    { isRead: true }
  );
  return result.modifiedCount > 0;
};

notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { userId, isRead: false }, 
    { isRead: true }
  );
  return result.modifiedCount;
};

notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.getUserNotifications = async function (userId, page = 1, limit = API_CONSTANTS.MAX_NOTIFICATIONS_PER_PAGE, unreadOnly = false) {
  const query: any = { userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);
  
  const totalPages = Math.ceil(total / limit);
  
  return { 
    notifications, 
    total, 
    page, 
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Manual cleanup method for old notifications (in case TTL doesn't work)
notificationSchema.statics.cleanupOldNotifications = async function () {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - API_CONSTANTS.MAX_NOTIFICATION_AGE_DAYS);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount || 0;
};

export const NotificationModel = mongoose.model<INotification, INotificationStatics>('Notification', notificationSchema);

export const Notification = NotificationModel;
