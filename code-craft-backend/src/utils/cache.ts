import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env';
import { logger } from './logger';

// Cache configuration
const CACHE_TTL = {
  POPULAR_TAGS: 3600, // 1 hour
  SNIPPET_LIST: 300,  // 5 minutes
  USER_PROFILE: 600,  // 10 minutes
};

// In-memory cache as fallback when Redis is not available
interface InMemoryCache {
  [key: string]: {
    value: any;
    expiresAt: number;
  };
}

class CacheService {
  private redisClient: RedisClientType | null = null;
  private inMemoryCache: InMemoryCache = {};
  private isConnected: boolean = false;
  private redisUrl: string | undefined;

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl || config.redisUrl;
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!this.redisUrl) {
      logger.info('Redis URL not configured, using in-memory cache');
      return;
    }

    try {
      this.redisClient = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection attempts exceeded');
              return new Error('Too many reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redisClient = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisClient && this.isConnected) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to in-memory cache
        const cached = this.inMemoryCache[key];
        if (cached && cached.expiresAt > Date.now()) {
          return cached.value;
        }
        // Clean up expired entry
        if (cached) {
          delete this.inMemoryCache[key];
        }
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.redisClient && this.isConnected) {
        if (ttl) {
          await this.redisClient.setEx(key, ttl, serialized);
        } else {
          await this.redisClient.set(key, serialized);
        }
      } else {
        // Fallback to in-memory cache
        this.inMemoryCache[key] = {
          value,
          expiresAt: ttl ? Date.now() + (ttl * 1000) : Infinity,
        };
        
        // Clean up old entries periodically
        this.cleanupInMemoryCache();
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.redisClient && this.isConnected) {
        await this.redisClient.del(key);
      } else {
        delete this.inMemoryCache[key];
      }
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.redisClient && this.isConnected) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } else {
        // For in-memory cache, use simple pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        Object.keys(this.inMemoryCache).forEach(key => {
          if (regex.test(key)) {
            delete this.inMemoryCache[key];
          }
        });
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupInMemoryCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    Object.entries(this.inMemoryCache).forEach(([key, value]) => {
      if (value.expiresAt <= now) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => delete this.inMemoryCache[key]);
  }

  /**
   * Generate cache key with namespace
   */
  static generateKey(namespace: string, ...params: (string | number)[]): string {
    return `code-craft:${namespace}:${params.join(':')}`;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  get isReady(): boolean {
    return this.redisClient?.isReady ?? false;
  }
}

// Export singleton instance
export const cache = new CacheService();

// Export the class for testing
export { CacheService };

// Export cache TTL constants
export { CACHE_TTL };

// Export key generation helper
export const cacheKeys = {
  popularTags: (limit: number) => CacheService.generateKey('popular-tags', limit),
  snippetList: (query: string) => CacheService.generateKey('snippets', query),
  userProfile: (userId: string) => CacheService.generateKey('user', userId),
};
