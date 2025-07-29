import mongoose from 'mongoose';

/**
 * Aggregation helpers for user queries to optimize performance
 */

/**
 * Get user profile with all related data in a single aggregation pipeline
 * This avoids multiple queries and improves performance
 */
export const getUserProfileAggregation = (userId: string) => {
  return [
    // Match the specific user
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    
    // Lookup followers
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followingId',
        as: 'followers',
      },
    },
    
    // Lookup following
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followerId',
        as: 'following',
      },
    },
    
    // Lookup recent snippets with virtual fields
    {
      $lookup: {
        from: 'snippets',
        let: { userId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          // Add star count
          {
            $lookup: {
              from: 'stars',
              localField: '_id',
              foreignField: 'snippetId',
              as: 'stars',
            },
          },
          // Add comment count
          {
            $lookup: {
              from: 'snippetcomments',
              localField: '_id',
              foreignField: 'snippetId',
              as: 'comments',
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              programmingLanguage: 1,
              createdAt: 1,
              tags: 1,
              starCount: { $size: '$stars' },
              commentCount: { $size: '$comments' },
            },
          },
        ],
        as: 'recentSnippets',
      },
    },
    
    // Lookup recent executions
    {
      $lookup: {
        from: 'codeexecutions',
        let: { userId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              language: 1,
              executionTime: 1,
              output: 1,
              error: 1,
              createdAt: 1,
            },
          },
        ],
        as: 'recentExecutions',
      },
    },
    
    // Final projection
    {
      $project: {
        user: {
          id: '$_id',
          name: '$name',
          bio: '$bio',
          createdAt: '$createdAt',
          followerCount: { $size: '$followers' },
          followingCount: { $size: '$following' },
        },
        recentActivity: {
          snippets: '$recentSnippets',
          executions: '$recentExecutions',
        },
      },
    },
  ];
};

/**
 * Get multiple users with follow counts in a single aggregation
 * Useful for search results to avoid N+1 queries
 */
export const getUsersWithFollowCounts = (userIds: mongoose.Types.ObjectId[]) => {
  return [
    // Match multiple users
    { $match: { _id: { $in: userIds } } },
    
    // Lookup followers
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followingId',
        as: 'followers',
      },
    },
    
    // Lookup following
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'followerId',
        as: 'following',
      },
    },
    
    // Project with counts
    {
      $project: {
        _id: 1,
        name: 1,
        bio: 1,
        createdAt: 1,
        followerCount: { $size: '$followers' },
        followingCount: { $size: '$following' },
      },
    },
  ];
};
