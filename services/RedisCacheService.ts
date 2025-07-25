import { ICacheService, AdvancedCacheStats, CacheNodeStats, CacheAnalytics } from '../common-interfaces/BridgeTypes';
import Redis from 'ioredis';

export interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  connectTimeout?: number;
  lazyConnect?: boolean;
}

export interface CacheStats {
  totalKeys: number;
  usedMemory: number;
  hitRate: number;
  hits: number;
  misses: number;
  totalRequests: number;
  connectionStatus: string;
  lastUpdated: Date;
}

export class RedisCacheService implements ICacheService {
  private redis: Redis;
  private config: RedisCacheConfig;
  private stats: {
    hits: number;
    misses: number;
    totalRequests: number;
    startTime: Date;
  };

  constructor(config: RedisCacheConfig) {
    this.config = {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      startTime: new Date()
    };

    // Create Redis client
    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      keyPrefix: this.config.keyPrefix || 'atous-orch:',

      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      connectTimeout: this.config.connectTimeout,
      lazyConnect: this.config.lazyConnect
    });

    // Setup event handlers
    this.redis.on('connect', () => {
      console.log('[RedisCacheService] Connected to Redis');
    });

    this.redis.on('ready', () => {
      console.log('[RedisCacheService] Redis connection ready');
    });

    this.redis.on('error', (error) => {
      console.error('[RedisCacheService] Redis error:', error);
    });

    this.redis.on('close', () => {
      console.log('[RedisCacheService] Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('[RedisCacheService] Reconnecting to Redis...');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.stats.totalRequests++;
      
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        console.log(`[RedisCacheService] Cache miss: ${key}`);
        return null;
      }

      this.stats.hits++;
      console.log(`[RedisCacheService] Cache hit: ${key}`);
      
      try {
        return JSON.parse(value) as T;
      } catch (parseError) {
        console.error(`[RedisCacheService] Failed to parse cached value for key ${key}:`, parseError);
        // Remove corrupted data
        await this.delete(key);
        return null;
      }
    } catch (error) {
      console.error(`[RedisCacheService] Error getting key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl && ttl > 0) {
        // Set with expiration (in seconds)
        await this.redis.setex(key, Math.ceil(ttl / 1000), serializedValue);
      } else {
        // Set without expiration
        await this.redis.set(key, serializedValue);
      }

      console.log(`[RedisCacheService] Cache set: ${key} (TTL: ${ttl || 'none'}ms)`);
    } catch (error) {
      console.error(`[RedisCacheService] Error setting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const result = await this.redis.del(key);
      console.log(`[RedisCacheService] Cache delete: ${key} (existed: ${result > 0})`);
    } catch (error) {
      console.error(`[RedisCacheService] Error deleting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      console.log('[RedisCacheService] Cache cleared');
    } catch (error) {
      console.error('[RedisCacheService] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<AdvancedCacheStats> {
    try {
      const [keyCount, memoryInfo, connectionStatus] = await Promise.all([
        this._getKeyCount(),
        this._getMemoryUsage(),
        this._getConnectionStatus()
      ]);

      const totalRequests = this.stats.totalRequests;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

      const redisNodeStats: CacheNodeStats = {
        hits: this.stats.hits,
        misses: this.stats.misses,
        evictions: 0, // Redis doesn't directly expose evictions in this context
        memoryUsage: memoryInfo,
        size: keyCount
      };

      const analytics: CacheAnalytics = {
        hitRateTrend: [hitRate], // Simplified - could be expanded to track trends over time
        missRateTrend: [totalRequests > 0 ? this.stats.misses / totalRequests : 0],
        evictionRateTrend: [0],
        growthRate: 0
      };

      return {
        levels: {
          redis: redisNodeStats
        },
        analytics,
        totalMemoryUsage: memoryInfo,
        totalEntries: keyCount,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('[RedisCacheService] Error getting stats:', error);
      const emptyNodeStats: CacheNodeStats = {
        hits: this.stats.hits,
        misses: this.stats.misses,
        evictions: 0,
        memoryUsage: 0,
        size: 0
      };

      const emptyAnalytics: CacheAnalytics = {
        hitRateTrend: [0],
        missRateTrend: [0],
        evictionRateTrend: [0],
        growthRate: 0
      };

      return {
        levels: {
          redis: emptyNodeStats
        },
        analytics: emptyAnalytics,
        totalMemoryUsage: 0,
        totalEntries: 0,
        lastUpdated: new Date()
      };
    }
  }

  private async _getKeyCount(): Promise<number> {
    const keys = await this.redis.keys(`${this.config.keyPrefix || ''}*`);
    return keys.length;
  }

  private async _getMemoryUsage(): Promise<number> {
    try {
      const info = await this.redis.memory('STATS');
      return Array.isArray(info) ? 0 : (info as number) || 0;
    } catch {
      return 0;
    }
  }

  private _getConnectionStatus(): string {
    switch (this.redis.status) {
      case 'connecting':
        return 'connecting';
      case 'connect':
        return 'connected';
      case 'ready':
        return 'ready';
      case 'reconnecting':
        return 'reconnecting';
      case 'end':
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  /**
   * Set multiple values at once (pipeline)
   */
  async setMultiple<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const serializedValue = JSON.stringify(entry.value);
        
        if (entry.ttl && entry.ttl > 0) {
          pipeline.setex(entry.key, Math.ceil(entry.ttl / 1000), serializedValue);
        } else {
          pipeline.set(entry.key, serializedValue);
        }
      }

      await pipeline.exec();
      console.log(`[RedisCacheService] Set ${entries.length} keys in pipeline`);
    } catch (error) {
      console.error('[RedisCacheService] Error in setMultiple:', error);
      throw error;
    }
  }

  /**
   * Get multiple values at once (pipeline)
   */
  async getMultiple<T>(keys: string[]): Promise<Array<{ key: string; value: T | null }>> {
    try {
      this.stats.totalRequests += keys.length;
      
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      const output: Array<{ key: string; value: T | null }> = [];

      if (results) {
        for (let i = 0; i < results.length; i++) {
          const [error, value] = results[i];
          const key = keys[i];
          
          if (error) {
            console.error(`[RedisCacheService] Error getting key ${key}:`, error);
            output.push({ key, value: null });
            this.stats.misses++;
            continue;
          }

          if (value === null) {
            output.push({ key, value: null });
            this.stats.misses++;
          } else {
            try {
              const parsedValue = JSON.parse(value as string) as T;
              output.push({ key, value: parsedValue });
              this.stats.hits++;
            } catch (parseError) {
              console.error(`[RedisCacheService] Failed to parse value for key ${key}:`, parseError);
              output.push({ key, value: null });
              this.stats.misses++;
            }
          }
        }
      }

      return output;
    } catch (error) {
      console.error('[RedisCacheService] Error in getMultiple:', error);
      this.stats.misses += keys.length;
      return keys.map(key => ({ key, value: null }));
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[RedisCacheService] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, Math.ceil(ttlMs / 1000));
      return result === 1;
    } catch (error) {
      console.error(`[RedisCacheService] Error setting TTL for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async getTTL(key: string): Promise<number> {
    try {
      const ttlSeconds = await this.redis.ttl(key);
      
      if (ttlSeconds === -1) {
        return -1; // Key exists but has no TTL
      } else if (ttlSeconds === -2) {
        return 0; // Key does not exist
      } else {
        return ttlSeconds * 1000; // Convert to milliseconds
      }
    } catch (error) {
      console.error(`[RedisCacheService] Error getting TTL for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    try {
      const result = await this.redis.incrby(key, delta);
      return result;
    } catch (error) {
      console.error(`[RedisCacheService] Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): RedisCacheConfig {
    return { ...this.config };
  }

  /**
   * Test connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[RedisCacheService] Ping failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('[RedisCacheService] Disconnected from Redis');
    } catch (error) {
      console.error('[RedisCacheService] Error disconnecting:', error);
      throw error;
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }
} 