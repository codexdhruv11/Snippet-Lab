import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISnippetComment extends Document {
  snippetId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  content: string;
  parentCommentId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  replyCount?: number;
  isOwnedBy(userId: string): boolean;
}

export interface ISnippetCommentMethods {
  isOwnedBy(userId: string): boolean;
}

export interface ISnippetCommentStatics {
  getBySnippetId(snippetId: string, page?: number, limit?: number): Promise<{
    comments: ISnippetComment[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getThreadedComments(snippetId: string, options?: {
    maxDepth?: number;
    sortOrder?: 'newest' | 'oldest';
    limit?: number;
  }): Promise<ISnippetComment[]>;
  getReplies(parentCommentId: string, page?: number, limit?: number): Promise<{
    replies: ISnippetComment[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getCommentDepth(commentId: string): Promise<number>;
}

export type SnippetCommentModel = mongoose.Model<ISnippetComment, {}, ISnippetCommentMethods> & ISnippetCommentStatics;

const snippetCommentSchema = new Schema<ISnippetComment, SnippetCommentModel, ISnippetCommentMethods>(
  {
    snippetId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Snippet',
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'SnippetComment',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret: Record<string, any>) {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  }
);

// Virtual field for counting replies
snippetCommentSchema.virtual('replyCount', {
  ref: 'SnippetComment',
  localField: '_id',
  foreignField: 'parentCommentId',
  count: true,
});

// Indexes
snippetCommentSchema.index({ snippetId: 1 });
snippetCommentSchema.index({ snippetId: 1, createdAt: -1 });
snippetCommentSchema.index({ userId: 1 });
snippetCommentSchema.index({ snippetId: 1, parentCommentId: 1 });
snippetCommentSchema.index({ parentCommentId: 1, createdAt: -1 });

// Optimized index for top-level comments (where parentCommentId is null)
// This helps with queries like { snippetId: X, parentCommentId: null }
snippetCommentSchema.index({ snippetId: 1, parentCommentId: 1, createdAt: -1 });

// Add pre-save validation for parentCommentId
snippetCommentSchema.pre('save', async function(next) {
  if (this.parentCommentId && this._id && this.parentCommentId.toString() === this._id.toString()) {
    return next(new Error('A comment cannot be a parent to itself.'));
  }
  
  // Check for circular references in the comment chain
  if (this.parentCommentId) {
    const visitedIds = new Set<string>();
    visitedIds.add((this._id as Types.ObjectId).toString());
    
    let currentCommentId = this.parentCommentId;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops
    
    while (currentCommentId && depth < maxDepth) {
      if (visitedIds.has(currentCommentId.toString())) {
        return next(new Error('Circular reference detected in comment chain.'));
      }
      
      visitedIds.add(currentCommentId.toString());
      
      const parentComment = await (this.constructor as any).findById(currentCommentId).select('parentCommentId');
      if (!parentComment) break;
      
      currentCommentId = parentComment.parentCommentId;
      depth++;
    }
  }
  
  next();
});

// Instance methods
snippetCommentSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId.toString() === userId;
};

// Static methods
snippetCommentSchema.statics.getBySnippetId = async function(
  snippetId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  
  const [comments, total] = await Promise.all([
    this.find({ snippetId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email'),
    this.countDocuments({ snippetId }),
  ]);

  return {
    comments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Get threaded comments with nested structure using efficient aggregation
snippetCommentSchema.statics.getThreadedComments = async function(
  snippetId: string,
  options = {}
) {
  const { maxDepth = 5, sortOrder = 'newest', limit = 50 } = options;
  const sortValue = sortOrder === 'newest' ? -1 : 1;
  
  // Use aggregation pipeline for efficient nested comment retrieval
  const pipeline: any[] = [
    // Match comments for the specific snippet
    { $match: { snippetId: new mongoose.Types.ObjectId(snippetId) } },
    
    // Sort by creation date
    { $sort: { createdAt: sortValue } },
    
    // Lookup user information
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $project: { name: 1, email: 1 } }
        ]
      }
    },
    
    // Unwind user info
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    
    // Add reply count using a separate lookup
    {
      $lookup: {
        from: 'snippetcomments',
        let: { commentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$parentCommentId', '$$commentId'] } } },
          { $count: 'count' }
        ],
        as: 'replyStats'
      }
    },
    
    // Extract reply count
    {
      $addFields: {
        replyCount: { $ifNull: [{ $arrayElemAt: ['$replyStats.count', 0] }, 0] },
        userId: '$userInfo'
      }
    },
    
    // Remove temporary fields
    { $project: { userInfo: 0, replyStats: 0 } },
    
    // Separate top-level and child comments
    {
      $facet: {
        topLevel: [
          { $match: { parentCommentId: null } },
          { $limit: limit }
        ],
        replies: [
          { $match: { parentCommentId: { $ne: null } } }
        ]
      }
    }
  ];
  
  const [result] = await this.aggregate(pipeline);
  
  if (!result || !result.topLevel || !result.replies) {
    return [];
  }
  
  // Build comment map for O(1) lookup
  const commentMap = new Map<string, any>();
  const allComments = [...result.topLevel, ...result.replies];
  
  allComments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
  });
  
  // Build tree structure with circular reference prevention
  const visitedIds = new Set<string>();
  const buildTree = (comments: any[], currentDepth: number = 0) => {
    if (currentDepth >= maxDepth) return;
    
    comments.forEach(comment => {
      if (visitedIds.has(comment._id.toString())) return;
      
      result.replies
        .filter((reply: any) => 
          reply.parentCommentId && 
          reply.parentCommentId.toString() === comment._id.toString() &&
          !visitedIds.has(reply._id.toString())
        )
        .forEach((reply: any) => {
          visitedIds.add(reply._id.toString());
          comment.replies.push(reply);
          buildTree([reply], currentDepth + 1);
        });
    });
  };
  
  buildTree(result.topLevel, 0);
  
  return result.topLevel;
};

// Get direct replies to a comment
snippetCommentSchema.statics.getReplies = async function(
  parentCommentId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  
  const [replies, total] = await Promise.all([
    this.find({ parentCommentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('replyCount'),
    this.countDocuments({ parentCommentId }),
  ]);

  return {
    replies,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Get comment depth
snippetCommentSchema.statics.getCommentDepth = async function(
  commentId: string
): Promise<number> {
  let depth = 0;
  let currentComment = await this.findById(commentId);
  
  while (currentComment && currentComment.parentCommentId && depth < 10) {
    depth++;
    currentComment = await this.findById(currentComment.parentCommentId);
  }
  
  return depth;
};

export const SnippetComment = mongoose.model<ISnippetComment, SnippetCommentModel>(
  'SnippetComment',
  snippetCommentSchema
);
