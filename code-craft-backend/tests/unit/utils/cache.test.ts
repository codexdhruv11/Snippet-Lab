import { CacheService, CACHE_TTL } from '../../../src/utils/cache';
import { createClient } from 'redis';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

// Mock logger
jest.mock('../../../src/utils/logger');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    // Setup mock Redis client
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
      isReady: true,
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor and Redis initialization', () => {
    it('should create CacheService with Redis client', async () => {
      cacheService = new CacheService('redis://localhost:6379');

      expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
        url: 'redis://localhost:6379'
      }));
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle Redis connection error and fallback to in-memory', async () => {
      const errorHandler = jest.fn();
      mockRedisClient.on.mockImplementation((event: string, handler: (...args: any[]) => any) => {
        if (event === 'error') errorHandler.mockImplementation(handler);
      });

      cacheService = new CacheService('redis://localhost:6379');
      
      // Simulate Redis error
      errorHandler(new Error('Connection failed'));

      // Should fallback to in-memory cache
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      
      await cacheService.set(testKey, testValue);
      const result = await cacheService.get(testKey);
      
      expect(result).toEqual(testValue);
    });

    it('should log when Redis connects successfully', () => {
      const connectHandler = jest.fn();
      mockRedisClient.on.mockImplementation((event: string, handler: (...args: any[]) => any) => {
        if (event === 'connect') connectHandler.mockImplementation(handler);
      });

      cacheService = new CacheService('redis://localhost:6379');
      
      // Simulate Redis connect event
      connectHandler();

      // Logger should have been called (mocked globally)
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('get() method', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should get value from Redis when available', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      const serializedValue = JSON.stringify(testValue);

      mockRedisClient.get.mockResolvedValue(serializedValue);
      // Ensure connected state
      const connectHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();

      const result = await cacheService.get(testKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testValue);
    });

    it('should return null when key not found in Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should fallback to in-memory cache when Redis is unavailable', async () => {
      // Simulate Redis disconnection
      const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection lost'));

      const testKey = 'test-key';
      const testValue = { data: 'test' };

      // Set value in in-memory cache
      await cacheService.set(testKey, testValue);

      // Get should retrieve from in-memory cache
      const result = await cacheService.get(testKey);

      expect(result).toEqual(testValue);
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const testKey = 'test-key';
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get(testKey);

      expect(result).toBeNull();
    });
  });

  describe('set() method', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should set value in Redis with TTL', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      const ttl = 3600;

      await cacheService.set(testKey, testValue, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        ttl,
        JSON.stringify(testValue)
      );
    });

    it('should set value in Redis without TTL', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };

      await cacheService.set(testKey, testValue);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
        {}
      );
    });

    it('should use in-memory cache when Redis is unavailable', async () => {
      mockRedisClient.isReady = false;

      const testKey = 'test-key';
      const testValue = { data: 'test' };

      await cacheService.set(testKey, testValue);

      // Verify it was stored in memory
      const result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should handle null/undefined values', async () => {
      await cacheService.set('null-key', null);
      await cacheService.set('undefined-key', undefined);

      expect(mockRedisClient.set).toHaveBeenCalledWith('null-key', 'null');
      expect(mockRedisClient.set).toHaveBeenCalledWith('undefined-key', 'undefined');
    });
  });

  describe('del() method', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should delete key from Redis', async () => {
      const testKey = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.del(testKey);

      expect(mockRedisClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should delete key from in-memory cache when Redis unavailable', async () => {
      mockRedisClient.isReady = false;

      const testKey = 'test-key';
      const testValue = { data: 'test' };

      // Set and then delete
      await cacheService.set(testKey, testValue);
      const beforeDelete = await cacheService.get(testKey);
      expect(beforeDelete).toEqual(testValue);

      await cacheService.del(testKey);
      const afterDelete = await cacheService.get(testKey);
      expect(afterDelete).toBeNull();
    });
  });

  describe('delPattern() method', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should delete keys matching pattern in Redis', async () => {
      const pattern = 'cache:user:*';
      const matchingKeys = ['cache:user:1', 'cache:user:2', 'cache:user:3'];

      mockRedisClient.keys.mockResolvedValue(matchingKeys);
      mockRedisClient.del.mockResolvedValue(3);

      await cacheService.delPattern(pattern);

      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).toHaveBeenCalledWith(matchingKeys);
    });

    it('should handle empty pattern matches', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await cacheService.delPattern('no-match:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('no-match:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should delete pattern from in-memory cache when Redis unavailable', async () => {
      mockRedisClient.isReady = false;

      // Set multiple keys
      await cacheService.set('user:1', { id: 1 });
      await cacheService.set('user:2', { id: 2 });
      await cacheService.set('other:1', { id: 3 });

      // Delete pattern
      await cacheService.delPattern('user:*');

      // Check results
      expect(await cacheService.get('user:1')).toBeNull();
      expect(await cacheService.get('user:2')).toBeNull();
      expect(await cacheService.get('other:1')).toEqual({ id: 3 });
    });

    it('should handle regex special characters in pattern', async () => {
      mockRedisClient.isReady = false;

      // Set key with special characters
      await cacheService.set('cache[user]:1', { id: 1 });
      await cacheService.set('cache[user]:2', { id: 2 });

      // Delete with escaped pattern
      await cacheService.delPattern('cache[user]:*');

      expect(await cacheService.get('cache[user]:1')).toBeNull();
      expect(await cacheService.get('cache[user]:2')).toBeNull();
    });
  });

  describe('in-memory cache expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockRedisClient.isReady = false; // Force in-memory mode
      cacheService = new CacheService('redis://localhost:6379');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire in-memory cache entries after TTL', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      const ttl = 60; // 60 seconds

      await cacheService.set(testKey, testValue, ttl);

      // Value should exist initially
      expect(await cacheService.get(testKey)).toEqual(testValue);

      // Fast forward time past TTL
      jest.advanceTimersByTime((ttl + 1) * 1000);

      // Value should be expired
      expect(await cacheService.get(testKey)).toBeNull();
    });

    it('should cleanup expired entries periodically', async () => {
      // Set multiple entries with different TTLs
      await cacheService.set('key1', 'value1', 30);
      await cacheService.set('key2', 'value2', 60);
      await cacheService.set('key3', 'value3', 90);

      // Fast forward to expire first key
      jest.advanceTimersByTime(35 * 1000);

      // Trigger cleanup by accessing cache
      await cacheService.get('key1');

      // Check results
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBe('value2');
      expect(await cacheService.get('key3')).toBe('value3');
    });

    it('should handle entries without TTL', async () => {
      await cacheService.set('permanent-key', 'permanent-value');

      // Fast forward time significantly
      jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

      // Value should still exist
      expect(await cacheService.get('permanent-key')).toBe('permanent-value');
    });
  });

  describe('close() method', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should close Redis connection', async () => {
      await cacheService.close();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle close when Redis is not ready', async () => {
      mockRedisClient.isReady = false;

      await cacheService.close();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    describe('generateKey()', () => {
      it('should generate cache key with single parameter', () => {
        const key = CacheService.generateKey('user', '123');
        expect(key).toBe('code-craft:user:123');
      });

      it('should generate cache key with multiple parameters', () => {
        const key = CacheService.generateKey('snippet', 'list', 'javascript', 'page1');
        expect(key).toBe('code-craft:snippet:list:javascript:page1');
      });

      it('should handle empty parameters', () => {
        const key = CacheService.generateKey('test');
        expect(key).toBe('code-craft:test');
      });

      it('should handle special characters in parameters', () => {
        const key = CacheService.generateKey('user', 'email@test.com');
        expect(key).toBe('code-craft:user:email@test.com');
      });
    });

    describe('cacheKeys helper functions', () => {
      it('should generate popular tags key', () => {
        const key = CacheService.generateKey('tags', 'popular');
        expect(key).toBe('code-craft:tags:popular');
      });

      it('should generate snippet list key with parameters', () => {
        const key = CacheService.generateKey('snippets', 'javascript', 'recent', 1);
        expect(key).toBe('code-craft:snippets:javascript:recent:1');
      });

      it('should generate user profile key', () => {
        const key = CacheService.generateKey('user', 'user123', 'profile');
        expect(key).toBe('code-craft:user:user123:profile');
      });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      cacheService = new CacheService('redis://localhost:6379');
    });

    it('should handle circular references in objects', async () => {
      const obj: any = { a: 1 };
      obj.circular = obj;

      await expect(cacheService.set('circular-key', obj)).rejects.toThrow();
    });

    it('should handle very large values', async () => {
      const largeArray = new Array(10000).fill('test-data');
      const key = 'large-key';

      await cacheService.set(key, largeArray);
      const result = await cacheService.get(key);

      expect(result).toEqual(largeArray);
    });

    it('should handle Redis reconnection', async () => {
      const errorHandler = jest.fn();
      const connectHandler = jest.fn();

      mockRedisClient.on.mockImplementation((event: string, handler: (...args: any[]) => any) => {
        if (event === 'error') errorHandler.mockImplementation(handler);
        if (event === 'connect') connectHandler.mockImplementation(handler);
      });

      cacheService = new CacheService('redis://localhost:6379');

      // Start connected
      connectHandler();
      
      // Set value in Redis
      await cacheService.set('test', 'redis-value');
      
      // Simulate connection error
      errorHandler(new Error('Connection lost'));

      // Try operation (should use in-memory)
      await cacheService.set('test-memory', 'memory-value');
      const memoryResult = await cacheService.get('test-memory');
      expect(memoryResult).toBe('memory-value');
      expect(mockRedisClient.set).not.toHaveBeenCalledWith('test-memory', expect.anything());

      // Simulate reconnection
      connectHandler();

      // Should now use Redis again
      mockRedisClient.get.mockResolvedValue('"redis-value"');
      const result = await cacheService.get('test');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test');
    });
  });
});
