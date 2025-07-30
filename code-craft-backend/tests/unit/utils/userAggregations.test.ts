import {
  getUserProfileAggregation,
  getUsersWithFollowCounts
} from '../../../src/utils/userAggregations';
import mongoose from 'mongoose';

describe('User Aggregations', () => {
  describe('getUserProfileAggregation()', () => {
    it('should return correct aggregation pipeline', () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const pipeline = getUserProfileAggregation(userId);

      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(6); // Should have 6 stages
      
      // Check $match stage
      expect(pipeline[0]).toEqual({ $match: { _id: new mongoose.Types.ObjectId(userId) } });
      
      // Check $lookup stages
      expect(pipeline[1]).toHaveProperty('$lookup');
      expect(pipeline[1].$lookup.from).toBe('follows');
      expect(pipeline[1].$lookup.as).toBe('followers');
      
      expect(pipeline[2]).toHaveProperty('$lookup');
      expect(pipeline[2].$lookup.from).toBe('follows');
      expect(pipeline[2].$lookup.as).toBe('following');
      
      expect(pipeline[3]).toHaveProperty('$lookup');
      expect(pipeline[3].$lookup.from).toBe('snippets');
      expect(pipeline[3].$lookup.as).toBe('recentSnippets');
      
      expect(pipeline[4]).toHaveProperty('$lookup');
      expect(pipeline[4].$lookup.from).toBe('codeexecutions');
      expect(pipeline[4].$lookup.as).toBe('recentExecutions');
      
      // Check $project stage
      expect(pipeline[5]).toHaveProperty('$project');
      expect(pipeline[5].$project).toHaveProperty('user');
      expect(pipeline[5].$project).toHaveProperty('recentActivity');
    });

    it('should handle string userId parameter', () => {
      const userId = '507f1f77bcf86cd799439011';
      const pipeline = getUserProfileAggregation(userId);
      
      expect(pipeline[0].$match._id).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(pipeline[0].$match._id.toString()).toBe(userId);
    });
  });

  describe('Pipeline Structure Validation', () => {
    it('should generate valid aggregation syntax', () => {
      const userId = '507f1f77bcf86cd799439011';
      const pipeline = getUserProfileAggregation(userId);

      pipeline.forEach((stage) => {
        expect(stage).toBeInstanceOf(Object);
        const stageKeys = Object.keys(stage);
        expect(stageKeys.length).toBe(1); // Each stage should have exactly one operator
        expect(stageKeys[0]).toMatch(/^\$[a-z]+/); // Stage operators start with $
      });
    });

    it('should have nested pipeline for snippets lookup', () => {
      const userId = '507f1f77bcf86cd799439011';
      const pipeline = getUserProfileAggregation(userId);
      
      const snippetsLookup = pipeline.find(stage => 
        stage.$lookup && stage.$lookup.from === 'snippets'
      );
      
      expect(snippetsLookup).toBeDefined();
      expect(snippetsLookup.$lookup.pipeline).toBeDefined();
      expect(Array.isArray(snippetsLookup.$lookup.pipeline)).toBe(true);
      
      // Check nested pipeline stages
      const nestedPipeline = snippetsLookup.$lookup.pipeline;
      expect(nestedPipeline.some(stage => stage.$match)).toBe(true);
      expect(nestedPipeline.some(stage => stage.$sort)).toBe(true);
      expect(nestedPipeline.some(stage => stage.$limit)).toBe(true);
      expect(nestedPipeline.some(stage => stage.$project)).toBe(true);
    });
  });

  describe('getUsersWithFollowCounts()', () => {
    it('should return pipeline with match and projection', () => {
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      const pipeline = getUsersWithFollowCounts(userIds);

      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(4); // Should have 4 stages
      
      // Check stages
      expect(pipeline[0]).toEqual({ $match: { _id: { $in: userIds } } });
      expect(pipeline[1].$lookup.from).toBe('follows');
      expect(pipeline[2].$lookup.from).toBe('follows');
      expect(pipeline[3].$project).toHaveProperty('followerCount');
      expect(pipeline[3].$project).toHaveProperty('followingCount');
    });

    it('should properly handle empty array input', () => {
      const pipeline = getUsersWithFollowCounts([]);
      expect(pipeline).toBeDefined();
      expect(pipeline).toContainEqual({ $match: { _id: { $in: [] } } });
    });

    it('should return correct follower and following counts', () => {
      const userIds = [new mongoose.Types.ObjectId()];
      const pipeline = getUsersWithFollowCounts(userIds);

      const projectStage = pipeline.find(stage => stage.$project);
      expect(projectStage).toBeDefined();
      expect(projectStage.$project.followerCount).toEqual({ $size: '$followers' });
      expect(projectStage.$project.followingCount).toEqual({ $size: '$following' });
      expect(projectStage.$project._id).toBe(1);
      expect(projectStage.$project.name).toBe(1);
      expect(projectStage.$project.bio).toBe(1);
      expect(projectStage.$project.createdAt).toBe(1);
    });
  });

  describe('ObjectId Handling', () => {
    it('should correctly create ObjectId from strings', () => {
      const idString = '507f1f77bcf86cd799439011';
      const objectId = new mongoose.Types.ObjectId(idString);

      expect(objectId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(objectId.toString()).toBe(idString);
    });

    it('should handle valid and invalid ObjectId strings', () => {
      const validId = '507f191e810c19729de860ea';
      const invalidId = 'invalid-object-id';

      expect(mongoose.isValidObjectId(validId)).toBe(true);
      expect(mongoose.isValidObjectId(invalidId)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle aggregation with non-existent user IDs', () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const pipeline = getUserProfileAggregation(userId);

      expect(pipeline).toBeDefined();
      expect(pipeline[0].$match._id).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('should handle empty array for getUsersWithFollowCounts', () => {
      const pipeline = getUsersWithFollowCounts([]);
      
      expect(pipeline).toBeDefined();
      expect(pipeline[0]).toEqual({ $match: { _id: { $in: [] } } });
    });

    it('should validate final projection structure', () => {
      const userId = '507f1f77bcf86cd799439011';
      const pipeline = getUserProfileAggregation(userId);
      
      const projectStage = pipeline[pipeline.length - 1];
      expect(projectStage.$project.user).toHaveProperty('id');
      expect(projectStage.$project.user).toHaveProperty('name');
      expect(projectStage.$project.user).toHaveProperty('bio');
      expect(projectStage.$project.user).toHaveProperty('createdAt');
      expect(projectStage.$project.user).toHaveProperty('followerCount');
      expect(projectStage.$project.user).toHaveProperty('followingCount');
      expect(projectStage.$project.recentActivity).toHaveProperty('snippets');
      expect(projectStage.$project.recentActivity).toHaveProperty('executions');
    });
  });
});

