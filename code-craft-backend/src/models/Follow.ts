import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { IUser } from './User';

// Custom error class for Follow model
export class FollowError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string = 'FOLLOW_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'FollowError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// User projection utility for consistent public user data
// Excludes sensitive fields like password, sessionTokens, etc.
export const PUBLIC_USER_PROJECTION = {
  _id: 1,
  name: 1,
  bio: 1,
  createdAt: 1,
  // Note: email is excluded for privacy in public follow lists
  // If email is needed, it should be added explicitly with proper authorization checks
};

// Helper to create aggregation projection from user fields
export const createUserProjection = (userAlias: string) => {
  const projection: Record<string, any> = {};
  Object.keys(PUBLIC_USER_PROJECTION).forEach(key => {
    projection[key] = `$${userAlias}.${key}`;
  });
  return projection;
};

export interface IFollow extends Document {
  followerId: Types.ObjectId;
  followingId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollowStatics extends Model<IFollow> {
  toggle(followerId: string, followingId: string): Promise<{
    isFollowing: boolean;
    followerCount: number;
  }>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowers(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<{
    followers: IUser[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalItems: number;
      hasMore: boolean;
    };
  }>;
  getFollowing(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<{
    following: IUser[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalItems: number;
      hasMore: boolean;
    };
  }>;
}

const followSchema = new Schema<IFollow>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(value: Types.ObjectId) {
          try {
            // Import User model locally to avoid circular dependency
            const User = mongoose.model('User');
            const user = await User.findById(value).lean();
            return !!user;
          } catch (error) {
            // Handle case where User model might not be registered
            console.error('Error validating follower user:', error);
            return false;
          }
        },
        message: 'Follower user does not exist or validation failed',
      },
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(value: Types.ObjectId) {
          try {
            // Import User model locally to avoid circular dependency
            const User = mongoose.model('User');
            const user = await User.findById(value).lean();
            return !!user;
          } catch (error) {
            // Handle case where User model might not be registered
            console.error('Error validating following user:', error);
            return false;
          }
        },
        message: 'Following user does not exist or validation failed',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Custom validator to prevent self-following
followSchema.path('followingId').validate(function(this: IFollow, value: Types.ObjectId) {
  return !this.followerId.equals(value);
}, 'Users cannot follow themselves');

// Pre-save hook to ensure users cannot follow themselves
followSchema.pre('save', function(next) {
  if (this.followerId.equals(this.followingId)) {
    const error = new Error('Users cannot follow themselves');
    return next(error);
  }
  next();
});

// Indexes
followSchema.index({ followerId: 1 });
followSchema.index({ followingId: 1 });
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Static methods
followSchema.statics.toggle = async function (
  followerId: string,
  followingId: string
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(followerId)) {
      throw new FollowError('Invalid follower ID format', 'INVALID_FOLLOWER_ID', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(followingId)) {
      throw new FollowError('Invalid following ID format', 'INVALID_FOLLOWING_ID', 400);
    }
    
    // Prevent self-following at the model level
    if (followerId === followingId) {
      throw new FollowError('Users cannot follow themselves', 'SELF_FOLLOW_NOT_ALLOWED', 400);
    }

    // First, check if the follow relationship exists
    const existingFollow = await this.findOne({ followerId, followingId }).session(session);
    
    let isFollowing: boolean;
    
    if (existingFollow) {
      // Unfollow: Use findOneAndDelete for atomic deletion
      await this.findOneAndDelete({ followerId, followingId }).session(session);
      isFollowing = false;
    } else {
      // Follow: Use findOneAndUpdate with upsert for atomic creation
      // This handles race conditions where multiple requests try to create the same follow
      await this.findOneAndUpdate(
        { followerId, followingId },
        { $setOnInsert: { followerId, followingId } },
        { upsert: true, new: true, session }
      );
      isFollowing = true;
    }
    
    // Get updated follower count
    const followerCount = await this.countDocuments({ followingId }).session(session);

    await session.commitTransaction();
    session.endSession();
    
    return { isFollowing, followerCount };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      // Follow relationship already exists, return current state
      // Create a new session for the count query to ensure consistency
      const countSession = await mongoose.startSession();
      try {
        countSession.startTransaction();
        const followerCount = await this.countDocuments({ followingId }).session(countSession);
        await countSession.commitTransaction();
        countSession.endSession();
        return { isFollowing: true, followerCount };
      } catch (countError) {
        await countSession.abortTransaction();
        countSession.endSession();
        // If we can't get the count, throw the original error
        throw new FollowError('Failed to toggle follow relationship', 'TOGGLE_FOLLOW_ERROR', 500);
      }
    }
    
    // Re-throw FollowError instances as-is, wrap others
    if (error instanceof FollowError) {
      throw error;
    }
    throw new FollowError('Failed to toggle follow relationship', 'TOGGLE_FOLLOW_ERROR', 500);
  }
};

followSchema.statics.isFollowing = async function (
  followerId: string,
  followingId: string
): Promise<boolean> {
  // Validate ObjectId formats
  if (!mongoose.Types.ObjectId.isValid(followerId)) {
    throw new FollowError('Invalid follower ID format', 'INVALID_FOLLOWER_ID', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(followingId)) {
    throw new FollowError('Invalid following ID format', 'INVALID_FOLLOWING_ID', 400);
  }
  
  try {
    const follow = await this.findOne({ followerId, followingId });
    return !!follow;
  } catch (error) {
    if (error instanceof FollowError) throw error;
    throw new FollowError('Failed to check following status', 'CHECK_FOLLOWING_ERROR', 500);
  }
};

followSchema.statics.getFollowerCount = async function (
  userId: string
): Promise<number> {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new FollowError('Invalid user ID format', 'INVALID_USER_ID', 400);
  }
  
  try {
    return await this.countDocuments({ followingId: userId });
  } catch (error) {
    if (error instanceof FollowError) throw error;
    throw new FollowError('Failed to get follower count', 'GET_FOLLOWER_COUNT_ERROR', 500);
  }
};

followSchema.statics.getFollowingCount = async function (
  userId: string
): Promise<number> {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new FollowError('Invalid user ID format', 'INVALID_USER_ID', 400);
  }
  
  try {
    return await this.countDocuments({ followerId: userId });
  } catch (error) {
    if (error instanceof FollowError) throw error;
    throw new FollowError('Failed to get following count', 'GET_FOLLOWING_COUNT_ERROR', 500);
  }
};

followSchema.statics.getFollowers = async function (
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  // Validate ObjectId before proceeding
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new FollowError('Invalid user ID format', 'INVALID_USER_ID', 400);
  }

  const skip = (page - 1) * limit;

  try {
    const [followers, totalItems] = await Promise.all([
      this.aggregate([
        { $match: { followingId: new mongoose.Types.ObjectId(userId) } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'followerId',
            foreignField: '_id',
            as: 'follower',
            pipeline: [
              {
                $project: PUBLIC_USER_PROJECTION,
              },
            ],
          },
        },
        { $unwind: '$follower' },
        {
          $project: createUserProjection('follower'),
        },
      ]),
      this.countDocuments({ followingId: userId }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasMore = page < totalPages;

    return {
      followers,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems,
        hasMore,
      },
    };
  } catch (error) {
    if (error instanceof FollowError) throw error;
    throw new FollowError('Failed to fetch followers list', 'FETCH_FOLLOWERS_ERROR', 500);
  }
};

followSchema.statics.getFollowing = async function (
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  // Validate ObjectId before proceeding
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new FollowError('Invalid user ID format', 'INVALID_USER_ID', 400);
  }

  const skip = (page - 1) * limit;

  try {
    const [following, totalItems] = await Promise.all([
      this.aggregate([
        { $match: { followerId: new mongoose.Types.ObjectId(userId) } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'followingId',
            foreignField: '_id',
            as: 'following',
            pipeline: [
              {
                $project: PUBLIC_USER_PROJECTION,
              },
            ],
          },
        },
        { $unwind: '$following' },
        {
          $project: createUserProjection('following'),
        },
      ]),
      this.countDocuments({ followerId: userId }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const hasMore = page < totalPages;

    return {
      following,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems,
        hasMore,
      },
    };
  } catch (error) {
    if (error instanceof FollowError) throw error;
    throw new FollowError('Failed to fetch following list', 'FETCH_FOLLOWING_ERROR', 500);
  }
};

export const FollowModel = mongoose.model<IFollow, IFollowStatics>(
  'Follow',
  followSchema
);

export const Follow = FollowModel;
