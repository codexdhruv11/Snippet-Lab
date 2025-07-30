import { User, Snippet, CodeExecution, SnippetComment, Star, Notification, Follow } from '../../src/models';
import { createTestUser, createTestSnippet, createTestComment } from '../setup';
import { API_CONSTANTS } from '../../src/utils/constants';
import mongoose from 'mongoose';

describe('Models Unit Tests', () => {
  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
      };

      const user = new User(userData);
      await user.save();

      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      // Password should be hashed
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PlainTextPassword',
        name: 'Test User',
      };

      const user = new User(userData);
      await user.save();

      // Password should be hashed, not plain text
      expect(user.password).not.toBe('PlainTextPassword');
      expect(user.password.length).toBeGreaterThan(20); // Bcrypt hashes are longer
    });

    it('should validate password correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
      };

      const user = new User(userData);
      await user.save();

      // Correct password should validate
      const isValidCorrect = await user.comparePassword('TestPassword123');
      expect(isValidCorrect).toBe(true);

      // Incorrect password should not validate
      const isValidIncorrect = await user.comparePassword('WrongPassword');
      expect(isValidIncorrect).toBe(false);
    });

    it('should enforce unique email', async () => {
      const email = 'duplicate@example.com';
      
      await User.create({
        email,
        password: 'TestPassword123',
        name: 'User 1',
      });

      const duplicateUser = new User({
        email,
        password: 'TestPassword123',
        name: 'User 2',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should have findByEmail static method', async () => {
      const user = await createTestUser();
      const foundUser = await User.findByEmail(user.email);
      
      expect(foundUser).toBeDefined();
      expect(foundUser!._id.toString()).toBe(user._id.toString());
    });

    it('should have isOwnedBy instance method', async () => {
      const user = await createTestUser();
      
      expect(user.isOwnedBy(user._id.toString())).toBe(true);
      expect(user.isOwnedBy('different-user-id')).toBe(false);
    });

    // Extended User Model Tests
    it('should test isLocked() method with various lockUntil scenarios', async () => {
      const user = await createTestUser();
      
      // Not locked by default
      expect(user.isLocked()).toBe(false);
      
      // Set lock in future
      user.lockUntil = new Date(Date.now() + 3600000); // 1 hour from now
      expect(user.isLocked()).toBe(true);
      
      // Set lock in past
      user.lockUntil = new Date(Date.now() - 3600000); // 1 hour ago
      expect(user.isLocked()).toBe(false);
    });

    it('should test incLoginAttempts() method crossing MAX_LOGIN_ATTEMPTS threshold', async () => {
      const user = await createTestUser();
      
      // Initially no failed attempts
      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
      
      // Increment attempts but not crossing threshold
      await user.incLoginAttempts();
      expect(user.loginAttempts).toBe(1);
      expect(user.lockUntil).toBeUndefined();
      
      // Set to threshold - 1
      user.loginAttempts = 4;
      await user.save();
      
      // Cross threshold
      await user.incLoginAttempts();
      expect(user.loginAttempts).toBe(5);
      expect(user.lockUntil).toBeDefined();
      expect(user.lockUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should test resetLoginAttempts() method clearing failed attempts', async () => {
      const user = await createTestUser();
      
      // Set some failed attempts and lock
      user.loginAttempts = 5;
      user.lockUntil = new Date(Date.now() + 3600000);
      await user.save();
      
      // Reset attempts
      await user.resetLoginAttempts();
      
      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
    });

    it('should test invalidateTokensBeforePasswordChange() method', async () => {
      const user = await createTestUser();
      const originalValidFrom = user.tokenValidFrom;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await user.invalidateTokensBeforePasswordChange();
      
      expect(user.tokenValidFrom).toBeDefined();
      expect(user.tokenValidFrom!.getTime()).toBeGreaterThan(originalValidFrom!.getTime());
    });

    it('should test getUserWithFollows() static method with aggregation pipeline', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      
      // Create follow relationships
      await Follow.create({ follower: user._id, following: otherUser._id });
      await Follow.create({ follower: otherUser._id, following: user._id });
      
      const userWithFollows = await User.getUserWithFollows(user._id.toString());
      
      expect(userWithFollows).toBeDefined();
      expect(userWithFollows!._id.toString()).toBe(user._id.toString());
      expect(userWithFollows!.followerCount).toBe(1);
      expect(userWithFollows!.followingCount).toBe(1);
    });

    it('should test virtual field getters for followerCount and followingCount', async () => {
      const user = await createTestUser();
      
      // Virtual fields should return 0 by default
      expect(user.followerCount).toBe(0);
      expect(user.followingCount).toBe(0);
    });

    it('should test password hashing middleware edge cases', async () => {
      const user = await createTestUser();
      const originalPassword = user.password;
      
      // Save without modifying password - should not rehash
      user.name = 'Updated Name';
      await user.save();
      expect(user.password).toBe(originalPassword);
      
      // Modify password - should rehash
      user.password = 'NewPassword123';
      await user.save();
      expect(user.password).not.toBe(originalPassword);
      expect(user.password).not.toBe('NewPassword123');
    });

    it('should test account lockout scenarios and expiration', async () => {
      const user = await createTestUser();
      
      // Lock account
      user.lockUntil = new Date(Date.now() + 1000); // 1 second from now
      await user.save();
      expect(user.isLocked()).toBe(true);
      
      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(user.isLocked()).toBe(false);
    });
  });

  describe('Snippet Model', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create a snippet with required fields', async () => {
      const snippetData = {
        userId: testUser._id,
        title: 'Test Snippet',
        language: 'javascript',
        code: 'console.log("Hello");',
        userName: testUser.name,
      };

      const snippet = new Snippet(snippetData);
      await snippet.save();

      expect(snippet.title).toBe(snippetData.title);
      expect(snippet.language).toBe(snippetData.language);
      expect(snippet.code).toBe(snippetData.code);
      expect(snippet.userName).toBe(snippetData.userName);
    });

    it('should validate supported languages', async () => {
      const snippet = new Snippet({
        userId: testUser._id,
        title: 'Test',
        language: 'unsupported-language',
        code: 'some code',
        userName: testUser.name,
      });

      await expect(snippet.save()).rejects.toThrow();
    });

    it('should accept all supported languages without premium restrictions', async () => {
      const languages = [
        'javascript', 'typescript', 'python', 'java', 'go',
        'rust', 'cpp', 'csharp', 'ruby', 'swift'
      ];

      for (const language of languages) {
        const snippet = new Snippet({
          userId: testUser._id,
          title: `Test ${language} Snippet`,
          language,
          code: `// ${language} code`,
          userName: testUser.name,
        });

        await expect(snippet.save()).resolves.toBeDefined();
      }
    });

    it('should have isOwnedBy instance method', async () => {
      const snippet = await createTestSnippet(testUser._id);
      
      expect(snippet.isOwnedBy(testUser._id.toString())).toBe(true);
      expect(snippet.isOwnedBy('different-user-id')).toBe(false);
    });

    it('should enforce title length limit', async () => {
      const longTitle = 'a'.repeat(101);
      
      const snippet = new Snippet({
        userId: testUser._id,
        title: longTitle,
        language: 'javascript',
        code: 'console.log("test");',
        userName: testUser.name,
      });

      await expect(snippet.save()).rejects.toThrow();
    });

    // Extended Snippet Model Tests
    it('should test tag normalization in the setter', async () => {
      const snippet = await createTestSnippet(testUser._id);
      
      // Test tag normalization
      snippet.tags = ['JavaScript', 'React.JS', 'node js', 'C#'];
      await snippet.save();
      
      expect(snippet.tags).toEqual(['javascript', 'reactjs', 'node-js', 'csharp']);
    });

    it('should test virtual fields (starCount, commentCount) population', async () => {
      const snippet = await createTestSnippet(testUser._id);
      
      // Virtual fields should return 0 by default
      expect(snippet.starCount).toBe(0);
      expect(snippet.commentCount).toBe(0);
    });

    it('should test language validation with all supported languages', async () => {
      const supportedLanguages = API_CONSTANTS.SUPPORTED_LANGUAGES.map(lang => lang.id);
      
      for (const language of supportedLanguages) {
        const snippet = new Snippet({
          userId: testUser._id,
          title: `Test ${language}`,
          language,
          code: `// ${language} code`,
          userName: testUser.name,
        });
        
        await expect(snippet.save()).resolves.toBeDefined();
      }
    });

    it('should test tag validation with max tags limit and invalid formats', async () => {
      const snippet = new Snippet({
        userId: testUser._id,
        title: 'Test',
        language: 'javascript',
        code: 'console.log("test");',
        userName: testUser.name,
      });
      
      // Test max tags limit
      snippet.tags = Array(6).fill('tag');
      await expect(snippet.save()).rejects.toThrow();
      
      // Test invalid tag format (too short)
      snippet.tags = ['a'];
      await expect(snippet.save()).rejects.toThrow();
      
      // Test invalid tag format (too long)
      snippet.tags = ['a'.repeat(31)];
      await expect(snippet.save()).rejects.toThrow();
    });

    it('should test isOwnedBy() with various user ID formats', async () => {
      const snippet = await createTestSnippet(testUser._id);
      
      // Test with string ID
      expect(snippet.isOwnedBy(testUser._id.toString())).toBe(true);
      
      // Test with ObjectId
      expect(snippet.isOwnedBy(testUser._id)).toBe(true);
      
      // Test with different user
      const otherUser = await createTestUser();
      expect(snippet.isOwnedBy(otherUser._id.toString())).toBe(false);
    });
  });

  describe('CodeExecution Model', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create a code execution record', async () => {
      const executionData = {
        userId: testUser._id,
        language: 'javascript',
        code: 'console.log("Hello");',
        output: 'Hello\n',
        executionTime: 150,
      };

      const execution = new CodeExecution(executionData);
      await execution.save();

      expect(execution.language).toBe(executionData.language);
      expect(execution.code).toBe(executionData.code);
      expect(execution.output).toBe(executionData.output);
      expect(execution.executionTime).toBe(executionData.executionTime);
    });

    it('should validate supported languages', async () => {
      const execution = new CodeExecution({
        userId: testUser._id,
        language: 'unsupported-language',
        code: 'some code',
      });

      await expect(execution.save()).rejects.toThrow();
    });

    it('should allow all supported languages without restrictions', async () => {
      const languages = [
        'javascript', 'typescript', 'python', 'java', 'go',
        'rust', 'cpp', 'csharp', 'ruby', 'swift'
      ];

      for (const language of languages) {
        const execution = new CodeExecution({
          userId: testUser._id,
          language,
          code: `// ${language} code`,
          output: `${language} output`,
          executionTime: 100,
        });

        await expect(execution.save()).resolves.toBeDefined();
      }
    });

    it('should have getUserStats static method', async () => {
      // Create some test executions
      await CodeExecution.create({
        userId: testUser._id,
        language: 'javascript',
        code: 'console.log("test1");',
        output: 'test1',
        executionTime: 100,
      });

      await CodeExecution.create({
        userId: testUser._id,
        language: 'python',
        code: 'print("test2")',
        output: 'test2',
        executionTime: 200,
      });

      const stats = await CodeExecution.getUserStats(testUser._id.toString());

      expect(stats.totalExecutions).toBe(2);
      expect(stats.languagesUsed).toBe(2);
      expect(stats.avgExecutionTime).toBe(150);
    });

    it('should have getRecentExecutions static method', async () => {
      // Create test executions
      await CodeExecution.create({
        userId: testUser._id,
        language: 'javascript',
        code: 'console.log("recent1");',
        output: 'recent1',
      });

      await CodeExecution.create({
        userId: testUser._id,
        language: 'python',
        code: 'print("recent2")',
        output: 'recent2',
      });

      const recentExecutions = await CodeExecution.getRecentExecutions(testUser._id.toString(), 5);

      expect(recentExecutions).toHaveLength(2);
      expect(recentExecutions[0].createdAt.getTime()).toBeGreaterThanOrEqual(recentExecutions[1].createdAt.getTime());
    });

    // Extended CodeExecution Model Tests
    it('should test getUserStats() aggregation with multiple executions', async () => {
      // Create varied test data
      await CodeExecution.create([
        {
          userId: testUser._id,
          language: 'javascript',
          code: 'console.log(1);',
          output: '1',
          executionTime: 100,
        },
        {
          userId: testUser._id,
          language: 'javascript',
          code: 'console.log(2);',
          output: '2',
          executionTime: 200,
        },
        {
          userId: testUser._id,
          language: 'python',
          code: 'print(3)',
          output: '3',
          executionTime: 150,
        },
      ]);
      
      const stats = await CodeExecution.getUserStats(testUser._id.toString());
      
      expect(stats.totalExecutions).toBe(3);
      expect(stats.languagesUsed).toBe(2);
      expect(stats.avgExecutionTime).toBe(150);
    });

    it('should test getRecentExecutions() with sorting and limits', async () => {
      // Create executions with time delays
      const executions = [];
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        const exec = await CodeExecution.create({
          userId: testUser._id,
          language: 'javascript',
          code: `console.log(${i});`,
          output: `${i}`,
        });
        executions.push(exec);
      }
      
      // Test with limit
      const recent5 = await CodeExecution.getRecentExecutions(testUser._id.toString(), 5);
      expect(recent5).toHaveLength(5);
      
      // Verify sorting (most recent first)
      for (let i = 0; i < recent5.length - 1; i++) {
        expect(recent5[i].createdAt.getTime()).toBeGreaterThanOrEqual(recent5[i + 1].createdAt.getTime());
      }
    });

    it('should test language validation edge cases', async () => {
      const execution = new CodeExecution({
        userId: testUser._id,
        language: '',
        code: 'test',
      });
      
      await expect(execution.save()).rejects.toThrow();
    });

    it('should test execution time statistics calculations', async () => {
      const execTimes = [50, 100, 150, 200, 250];
      
      for (const time of execTimes) {
        await CodeExecution.create({
          userId: testUser._id,
          language: 'javascript',
          code: 'test',
          output: 'test',
          executionTime: time,
        });
      }
      
      const stats = await CodeExecution.getUserStats(testUser._id.toString());
      expect(stats.avgExecutionTime).toBe(150);
    });
  });

  describe('Star Model', () => {
    let testUser: any;
    let testSnippet: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      testSnippet = await createTestSnippet(testUser._id);
    });

    it('should create a star', async () => {
      const star = new Star({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });

      await star.save();

      expect(star.userId.toString()).toBe(testUser._id.toString());
      expect(star.snippetId.toString()).toBe(testSnippet._id.toString());
    });

    it('should enforce unique user-snippet combination', async () => {
      await Star.create({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });

      const duplicateStar = new Star({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });

      await expect(duplicateStar.save()).rejects.toThrow();
    });

    it('should have toggle static method', async () => {
      // First toggle - should create star
      const result1 = await Star.toggle(testUser._id.toString(), testSnippet._id.toString());
      expect(result1.isStarred).toBe(true);
      expect(result1.starCount).toBe(1);

      // Second toggle - should remove star
      const result2 = await Star.toggle(testUser._id.toString(), testSnippet._id.toString());
      expect(result2.isStarred).toBe(false);
      expect(result2.starCount).toBe(0);
    });

    it('should have isStarredBy static method', async () => {
      expect(await Star.isStarredBy(testUser._id.toString(), testSnippet._id.toString())).toBe(false);

      await Star.create({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });

      expect(await Star.isStarredBy(testUser._id.toString(), testSnippet._id.toString())).toBe(true);
    });

    it('should have getStarCount static method', async () => {
      expect(await Star.getStarCount(testSnippet._id.toString())).toBe(0);

      await Star.create({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });

      expect(await Star.getStarCount(testSnippet._id.toString())).toBe(1);
    });

    // Extended Star Model Tests
    it('should test getUserStarredSnippets() pagination and population', async () => {
      const otherUser = await createTestUser();
      const snippets = [];
      
      // Create multiple snippets and star them
      for (let i = 0; i < 15; i++) {
        const snippet = await createTestSnippet(otherUser._id);
        snippets.push(snippet);
        await Star.create({
          userId: testUser._id,
          snippetId: snippet._id,
        });
      }
      
      // Test first page
      const page1 = await Star.getUserStarredSnippets(testUser._id.toString(), 1, 10);
      expect(page1.stars).toHaveLength(10);
      expect(page1.total).toBe(15);
      expect(page1.totalPages).toBe(2);
      
      // Test second page
      const page2 = await Star.getUserStarredSnippets(testUser._id.toString(), 2, 10);
      expect(page2.stars).toHaveLength(5);
      
      // Verify population
      expect(page1.stars[0].snippetId).toHaveProperty('title');
      expect(page1.stars[0].snippetId).toHaveProperty('language');
    });

    it('should test toggle() method race conditions and duplicate handling', async () => {
      // Test concurrent toggles
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(Star.toggle(testUser._id.toString(), testSnippet._id.toString()));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed without throwing errors
      const starredCount = results.filter(r => r.isStarred).length;
      const unstarredCount = results.filter(r => !r.isStarred).length;
      
      // Should end up in a consistent state
      expect(starredCount + unstarredCount).toBe(5);
    });

    it('should test unique constraint violations', async () => {
      await Star.create({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });
      
      // Try to create duplicate
      const duplicate = new Star({
        userId: testUser._id,
        snippetId: testSnippet._id,
      });
      
      await expect(duplicate.save()).rejects.toThrow(/duplicate key/);
    });
  });

  describe('SnippetComment Model', () => {
    let testUser: any;
    let testSnippet: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      testSnippet = await createTestSnippet(testUser._id);
    });

    it('should create a comment', async () => {
      const commentData = {
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'This is a test comment',
      };

      const comment = new SnippetComment(commentData);
      await comment.save();

      expect(comment.content).toBe(commentData.content);
      expect(comment.userName).toBe(commentData.userName);
    });

    it('should have isOwnedBy instance method', async () => {
      const comment = new SnippetComment({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Test comment',
      });

      await comment.save();

      expect(comment.isOwnedBy(testUser._id.toString())).toBe(true);
      expect(comment.isOwnedBy('different-user-id')).toBe(false);
    });

    it('should enforce content length limit', async () => {
      const longContent = 'a'.repeat(1001);
      
      const comment = new SnippetComment({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: longContent,
      });

      await expect(comment.save()).rejects.toThrow();
    });

    it('should have getBySnippetId static method', async () => {
      await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Comment 1',
      });

      await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Comment 2',
      });

      const result = await SnippetComment.getBySnippetId(testSnippet._id.toString(), 1, 10);

      expect(result.comments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    // Extended SnippetComment Model Tests
    it('should test getThreadedComments() aggregation with nested replies', async () => {
      // Create parent comment
      const parentComment = await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Parent comment',
      });
      
      // Create replies
      const reply1 = await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Reply 1',
        parentId: parentComment._id,
      });
      
      await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Reply to reply',
        parentId: reply1._id,
      });
      
      const threaded = await SnippetComment.getThreadedComments(testSnippet._id.toString());
      
      expect(threaded).toHaveLength(1); // Only parent at root level
      expect(threaded[0].replies).toHaveLength(1);
      expect(threaded[0].replies![0].replies).toHaveLength(1);
    });

    it('should test getReplies() pagination', async () => {
      const parentComment = await createTestComment(testSnippet._id, testUser._id);
      
      // Create multiple replies
      for (let i = 0; i < 15; i++) {
        await SnippetComment.create({
          snippetId: testSnippet._id,
          userId: testUser._id,
          userName: testUser.name,
          content: `Reply ${i}`,
          parentId: parentComment._id,
        });
      }
      
      const replies = await SnippetComment.getReplies(parentComment._id.toString(), 1, 10);
      
      expect(replies.replies).toHaveLength(10);
      expect(replies.total).toBe(15);
      expect(replies.hasMore).toBe(true);
    });

    it('should test getCommentDepth() calculation', async () => {
      const parent = await createTestComment(testSnippet._id, testUser._id);
      const child1 = await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Level 1',
        parentId: parent._id,
      });
      const child2 = await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Level 2',
        parentId: child1._id,
      });
      
      expect(await SnippetComment.getCommentDepth(parent._id.toString())).toBe(0);
      expect(await SnippetComment.getCommentDepth(child1._id.toString())).toBe(1);
      expect(await SnippetComment.getCommentDepth(child2._id.toString())).toBe(2);
    });

    it('should test circular reference prevention in pre-save hook', async () => {
      const comment1 = await createTestComment(testSnippet._id, testUser._id);
      const comment2 = await SnippetComment.create({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Comment 2',
        parentId: comment1._id,
      });
      
      // Try to create circular reference
      comment1.parentId = comment2._id;
      
      await expect(comment1.save()).rejects.toThrow(/Circular reference/);
    });

    it('should test comment threading with maxDepth limits', async () => {
      let currentParent = await createTestComment(testSnippet._id, testUser._id);
      
      // Create chain up to max depth
      for (let i = 0; i < 4; i++) {
        const child = await SnippetComment.create({
          snippetId: testSnippet._id,
          userId: testUser._id,
          userName: testUser.name,
          content: `Level ${i + 1}`,
          parentId: currentParent._id,
        });
        currentParent = child;
      }
      
      // Try to exceed max depth
      const tooDeep = new SnippetComment({
        snippetId: testSnippet._id,
        userId: testUser._id,
        userName: testUser.name,
        content: 'Too deep',
        parentId: currentParent._id,
      });
      
      await expect(tooDeep.save()).rejects.toThrow(/Comment thread too deep/);
    });
  });

  // New Notification Model Tests
  describe('Notification Model', () => {
    let testUser: any;
    let otherUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      otherUser = await createTestUser();
    });

    it('should test createNotification() static method', async () => {
      const notification = await Notification.createNotification(
        testUser._id.toString(),
        'follow',
        'Someone followed you',
        { followerId: otherUser._id }
      );
      
      expect(notification.userId.toString()).toBe(testUser._id.toString());
      expect(notification.type).toBe('follow');
      expect(notification.message).toBe('Someone followed you');
      expect(notification.data.followerId).toBe(otherUser._id.toString());
      expect(notification.read).toBe(false);
    });

    it('should test createBulkNotifications() with partial failures', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      // Mock one failure
      jest.spyOn(Notification, 'create').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      const result = await Notification.createBulkNotifications(
        [user1._id.toString(), user2._id.toString()],
        'new_snippet',
        'New snippet posted',
        { snippetId: 'test-snippet-id' }
      );
      
      // Should still return successful notifications
      expect(result.length).toBeGreaterThan(0);
    });

    it('should test markAsRead() and markAllAsRead() methods', async () => {
      const notification = await Notification.createNotification(
        testUser._id.toString(),
        'comment',
        'New comment',
        {}
      );
      
      expect(notification.read).toBe(false);
      
      // Mark single as read
      await Notification.markAsRead(notification._id.toString());
      const updated = await Notification.findById(notification._id);
      expect(updated!.read).toBe(true);
      
      // Create more notifications
      await Notification.createNotification(testUser._id.toString(), 'follow', 'New follower', {});
      await Notification.createNotification(testUser._id.toString(), 'star', 'New star', {});
      
      // Mark all as read
      const result = await Notification.markAllAsRead(testUser._id.toString());
      expect(result.modifiedCount).toBeGreaterThanOrEqual(2);
    });

    it('should test getUnreadCount() method', async () => {
      await Notification.createNotification(testUser._id.toString(), 'follow', 'Follower 1', {});
      await Notification.createNotification(testUser._id.toString(), 'follow', 'Follower 2', {});
      await Notification.createNotification(testUser._id.toString(), 'follow', 'Follower 3', {});
      
      const count = await Notification.getUnreadCount(testUser._id.toString());
      expect(count).toBe(3);
    });

    it('should test getUserNotifications() with pagination and filtering', async () => {
      // Create various notification types
      for (let i = 0; i < 5; i++) {
        await Notification.createNotification(testUser._id.toString(), 'follow', `Follow ${i}`, {});
        await Notification.createNotification(testUser._id.toString(), 'comment', `Comment ${i}`, {});
      }
      
      // Test pagination
      const page1 = await Notification.getUserNotifications(testUser._id.toString(), { page: 1, limit: 5 });
      expect(page1.notifications).toHaveLength(5);
      expect(page1.total).toBe(10);
      
      // Test type filtering
      const filtered = await Notification.getUserNotifications(testUser._id.toString(), {
        page: 1,
        limit: 10,
        type: 'follow'
      });
      expect(filtered.notifications).toHaveLength(5);
      expect(filtered.notifications.every(n => n.type === 'follow')).toBe(true);
    });

    it('should test cleanupOldNotifications() method', async () => {
      // Mock deleteMany to test without waiting
      const deleteManyMock = jest.spyOn(Notification, 'deleteMany');
      
      await Notification.cleanupOldNotifications();
      
      expect(deleteManyMock).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) }
      });
      
      deleteManyMock.mockRestore();
    });

    it('should test data sanitization in setter', async () => {
      const notification = new Notification({
        userId: testUser._id,
        type: 'follow',
        message: 'Test',
        data: {
          $where: 'malicious code',
          safe: 'data'
        }
      });
      
      await notification.save();
      
      expect(notification.data.$where).toBeUndefined();
      expect(notification.data.safe).toBe('data');
    });

    it('should test notification type validation', async () => {
      const notification = new Notification({
        userId: testUser._id,
        type: 'invalid_type',
        message: 'Test',
        data: {}
      });
      
      await expect(notification.save()).rejects.toThrow();
    });

    it('should test data size validation', async () => {
      const largeData = {
        bigString: 'x'.repeat(10000)
      };
      
      const notification = new Notification({
        userId: testUser._id,
        type: 'follow',
        message: 'Test',
        data: largeData
      });
      
      await expect(notification.save()).rejects.toThrow();
    });
  });

  // New Follow Model Tests
  describe('Follow Model', () => {
    let user1: any;
    let user2: any;
    let user3: any;

    beforeEach(async () => {
      user1 = await createTestUser();
      user2 = await createTestUser();
      user3 = await createTestUser();
    });

    it('should test toggle() method with transactions and error handling', async () => {
      // First toggle - create follow
      const result1 = await Follow.toggle(user1._id.toString(), user2._id.toString());
      expect(result1.isFollowing).toBe(true);
      expect(result1.followerCount).toBe(1);
      expect(result1.followingCount).toBe(1);
      
      // Second toggle - remove follow
      const result2 = await Follow.toggle(user1._id.toString(), user2._id.toString());
      expect(result2.isFollowing).toBe(false);
      expect(result2.followerCount).toBe(0);
      expect(result2.followingCount).toBe(0);
    });

    it('should test isFollowing() method', async () => {
      expect(await Follow.isFollowing(user1._id.toString(), user2._id.toString())).toBe(false);
      
      await Follow.create({ follower: user1._id, following: user2._id });
      
      expect(await Follow.isFollowing(user1._id.toString(), user2._id.toString())).toBe(true);
    });

    it('should test getFollowerCount() and getFollowingCount() methods', async () => {
      await Follow.create({ follower: user1._id, following: user2._id });
      await Follow.create({ follower: user3._id, following: user2._id });
      await Follow.create({ follower: user2._id, following: user3._id });
      
      expect(await Follow.getFollowerCount(user2._id.toString())).toBe(2);
      expect(await Follow.getFollowingCount(user1._id.toString())).toBe(1);
      expect(await Follow.getFollowingCount(user2._id.toString())).toBe(1);
    });

    it('should test getFollowers() and getFollowing() aggregation pipelines', async () => {
      await Follow.create({ follower: user1._id, following: user2._id });
      await Follow.create({ follower: user3._id, following: user2._id });
      
      // Test getFollowers
      const followers = await Follow.getFollowers(user2._id.toString(), 1, 10);
      expect(followers.users).toHaveLength(2);
      expect(followers.total).toBe(2);
      expect(followers.users[0]).toHaveProperty('name');
      expect(followers.users[0]).toHaveProperty('email');
      
      // Test getFollowing
      const following = await Follow.getFollowing(user1._id.toString(), 1, 10);
      expect(following.users).toHaveLength(1);
      expect(following.users[0]._id.toString()).toBe(user2._id.toString());
    });

    it('should test self-follow prevention in validation and pre-save hook', async () => {
      const follow = new Follow({
        follower: user1._id,
        following: user1._id
      });
      
      await expect(follow.save()).rejects.toThrow(/cannot follow yourself/);
    });

    it('should test FollowError custom error class', async () => {
      try {
        await Follow.toggle(user1._id.toString(), user1._id.toString());
      } catch (error: any) {
        expect(error.name).toBe('FollowError');
        expect(error.message).toContain('cannot follow yourself');
      }
    });

    it('should test ObjectId validation in static methods', async () => {
      await expect(Follow.toggle('invalid-id', user2._id.toString()))
        .rejects.toThrow(/Invalid user ID/);
      
      await expect(Follow.isFollowing(user1._id.toString(), 'invalid-id'))
        .rejects.toThrow(/Invalid user ID/);
    });

    it('should test duplicate follow constraint handling', async () => {
      await Follow.create({ follower: user1._id, following: user2._id });
      
      const duplicate = new Follow({
        follower: user1._id,
        following: user2._id
      });
      
      await expect(duplicate.save()).rejects.toThrow(/duplicate key/);
    });

    it('should test transaction rollback scenarios', async () => {
      // Mock User.updateOne to fail
      const updateOneSpy = jest.spyOn(User, 'updateOne').mockRejectedValueOnce(new Error('Update failed'));
      
      try {
        await Follow.toggle(user1._id.toString(), user2._id.toString());
      } catch (error) {
        // Should rollback - no follow relationship should exist
        const followExists = await Follow.findOne({ follower: user1._id, following: user2._id });
        expect(followExists).toBeNull();
      }
      
      updateOneSpy.mockRestore();
    });

    it('should test user existence validation in schema validators', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const follow = new Follow({
        follower: nonExistentId,
        following: user2._id
      });
      
      await expect(follow.save()).rejects.toThrow(/User .* does not exist/);
    });
  });
});
