import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { performanceMonitor } from '../utils/performance-monitor';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt?: Date;
  sessionTokens: string[];
  toJSON(): any;
  comparePassword(password: string): Promise<boolean>;
  _id: mongoose.Types.ObjectId;
  
  /**
   * Virtual Fields - Follow Counts
   * 
   * ⚠️  IMPORTANT: These fields are virtual and require explicit population.
   * They will be undefined unless specifically populated.
   * 
   * DECISION MATRIX:
   * 
   * ┌─────────────────────┬─────────────────────┬─────────────────────┐
   * │     USE CASE        │   RECOMMENDED       │      REASON         │
   * ├─────────────────────┼─────────────────────┼─────────────────────┤
   * │ Single user + counts│ getUserWithFollows()│ Single query,       │
   * │                     │                     │ guaranteed results  │
   * ├─────────────────────┼─────────────────────┼─────────────────────┤
   * │ Single user profile │ Virtual population  │ Flexible, on-demand │
   * │ (optional counts)   │ .populate('follower'│                     │
   * │                     │ Count')             │                     │
   * ├─────────────────────┼─────────────────────┼─────────────────────┤
   * │ Multiple users      │ Omit counts OR      │ Avoid N+1 queries   │
   * │                     │ custom aggregation  │                     │
   * ├─────────────────────┼─────────────────────┼─────────────────────┤
   * │ User lists/search   │ Omit counts         │ Performance first   │
   * └─────────────────────┴─────────────────────┴─────────────────────┘
   * 
   * EXAMPLES:
   * ```typescript
   * // ✅ Single user with guaranteed counts (RECOMMENDED)
   * const userWithCounts = await User.getUserWithFollows(userId);
   * 
   * // ✅ Single user with optional counts
   * const user = await User.findById(id)
   *   .populate('followerCount')
   *   .populate('followingCount');
   * 
   * // ❌ NEVER do this - causes N+1 queries!
   * const users = await User.find().populate('followerCount');
   * 
   * // ✅ Multiple users without counts (fast)
   * const users = await User.find();
   * ```
   */
  followerCount?: number;
  followingCount?: number;
}

export interface IUserMethods {
  isOwnedBy(userId: string): boolean;
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  invalidateTokensBeforePasswordChange(): Promise<void>;
}

export interface IUserStatics {
  findByEmail(email: string): Promise<IUser | null>;
  comparePasswordStatic(password: string, hash: string): Promise<boolean>;
  getUserWithFollows(userId: string): Promise<any>;
}

export type UserModel = mongoose.Model<IUser, {}, IUserMethods> & IUserStatics;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
      default: '',
    },
    failedLoginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
      required: false,
    },
    passwordChangedAt: {
      type: Date,
      required: false,
    },
    sessionTokens: {
      type: [String],
      required: true,
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret: Record<string, any>) {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text' }); // Text index for user search

// Virtual fields for follow counts
// PERFORMANCE WARNING: Virtual fields require additional database queries.
// They are NOT populated by default to optimize performance.
//
// ⚠️ N+1 QUERY WARNING: DO NOT populate these fields when fetching multiple users!
// Each virtual field population triggers a separate database query per user.
// For lists of users, this creates N+1 query problems that severely impact performance.
//
// Usage patterns:
// 1. Single user with counts (when needed):
//    await User.findById(id).populate('followerCount').populate('followingCount')
//
// 2. Better performance for single user:
//    await User.getUserWithFollows(userId) // Uses aggregation, single query
//
// 3. Multiple users: NEVER populate virtuals - use custom aggregation instead
//    ❌ WRONG: await User.find().populate('followerCount') // N+1 queries!
//    ✅ RIGHT: Use custom aggregation pipeline or omit counts
//
// Note: These virtuals will be undefined unless explicitly populated.
// Consider if you really need the counts before populating them.

// Enhanced performance tracking for virtual fields
userSchema.virtual('followerCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'followingId',
  count: true,
  justOne: false,
  // Enhanced getter with context-aware performance monitoring
  get: function(value: number | undefined) {
    if (process.env.NODE_ENV !== 'production' && process.env.MONITOR_VIRTUAL_FIELDS !== 'false') {
      // Detect if this is part of a bulk operation
      const parent = (this as any).parent?.();
      const isBulkOperation = parent && Array.isArray(parent);
      const documentCount = isBulkOperation ? parent.length : 1;
      
      performanceMonitor.trackVirtualFieldUsage('followerCount', {
        isBulkOperation,
        documentCount,
      });
    }
    return value;
  },
});

userSchema.virtual('followingCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'followerId',
  count: true,
  justOne: false,
  // Enhanced getter with context-aware performance monitoring
  get: function(value: number | undefined) {
    if (process.env.NODE_ENV !== 'production' && process.env.MONITOR_VIRTUAL_FIELDS !== 'false') {
      // Detect if this is part of a bulk operation
      const parent = (this as any).parent?.();
      const isBulkOperation = parent && Array.isArray(parent);
      const documentCount = isBulkOperation ? parent.length : 1;
      
      performanceMonitor.trackVirtualFieldUsage('followingCount', {
        isBulkOperation,
        documentCount,
      });
    }
    return value;
  },
});

// Account lockout constants
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
const MAX_LOGIN_ATTEMPTS = 5;

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Track password change time for session invalidation
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
      // Clear all session tokens on password change
      this.sessionTokens = [];
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
userSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this._id instanceof mongoose.Types.ObjectId && this._id.toString() === userId;
};

userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment login attempts and lock account if necessary
userSchema.methods.incLoginAttempts = async function(): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
    return;
  }
  
  // Otherwise we're incrementing
  const updates: any = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock the account after reaching max attempts
  if (this.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
  }
  
  await this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  await this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Invalidate tokens before password change
userSchema.methods.invalidateTokensBeforePasswordChange = async function(): Promise<void> {
  this.passwordChangedAt = new Date();
  this.sessionTokens = [];
  await this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email }).select('+password');
};

userSchema.statics.comparePasswordStatic = async function(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
};

// Efficiently fetch user with follow counts using aggregation
userSchema.statics.getUserWithFollows = async function (userId: string) {
  // Validate ObjectId before proceeding
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID format');
  }

  const result = await this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followingId',
        as: 'followers',
      },
    },
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followerId',
        as: 'following',
      },
    },
    {
      $project: {
        email: 1,
        name: 1,
        bio: 1,      // Include bio field
        createdAt: 1, // Include createdAt field
        followerCount: { $size: '$followers' },
        followingCount: { $size: '$following' },
      },
    },
  ]);

  // Return single user object instead of array
  return result.length > 0 ? result[0] : null;
};

// Custom toJSON method
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  const { __v, ...rest } = userObject;
  return rest;
};

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
export const UserModel = User;
