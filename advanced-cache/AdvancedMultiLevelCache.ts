import { ICacheService, CacheEntry, AdvancedCacheStats, CacheNodeStats, CacheAnalytics, AdvancedCacheLevel } from '../common-interfaces/BridgeTypes';
import Redis, { RedisOptions } from 'ioredis';
import { LRUCache } from 'lru-cache';
import { promisify } from 'util';
import { gzip as gzipCallback, gunzip as gunzipCallback } from 'zlib';

const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

export interface AdvancedCacheConfig {
  redis?: RedisOptions;
  memory?: {
    maxSize: number;
    ttl: number;
    priority?: number;
    adaptiveSize?: boolean;
    adaptiveThreshold?: number;
  };
  enableCompression?: boolean;
  enableEncryption?: boolean;
  analyticsEnabled?: boolean;
  enablePrefetching?: boolean;
  prefetchThreshold?: number;
  levels?: {
    [key: string]: AdvancedCacheLevel;
  };
}

interface AccessPattern {
  key: string;
  timestamp: number;
  frequency: number;
  lastAccess: number;
  predictedNextAccess?: number;
}

interface CacheNode {
  level: AdvancedCacheLevel;
  storage: LRUCache<string, CacheEntry<any>>;
  stats: CacheNodeStats & {
    writes: number;
    compressionRatio: number;
    averageAccessTime: number;
    lastUpdated: Date;
  };
}

export class AdvancedMultiLevelCache implements ICacheService {
  private cacheNodes: Map<string, CacheNode> = new Map();
  private redisClient: Redis;
  private config: AdvancedCacheConfig;
  private analytics: CacheAnalytics = {
    hitRateTrend: [],
    missRateTrend: [],
    evictionRateTrend: [],
    growthRate: 0,
    hits: 0,
    misses: 0,
    averageLatency: 0
  };
  private accessPatterns: Map<string, AccessPattern> = new Map();
  private prefetchQueue: Set<string> = new Set();

  constructor(config: AdvancedCacheConfig = {}) {
    this.config = {
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        ...config.redis
      },
      memory: {
        maxSize: 1000,
        ttl: 3600,
        priority: 1,
        adaptiveSize: true,
        adaptiveThreshold: 0.8,
        ...config.memory
      },
      enableCompression: config.enableCompression ?? false,
      enableEncryption: config.enableEncryption ?? false,
      analyticsEnabled: config.analyticsEnabled ?? true,
      enablePrefetching: config.enablePrefetching ?? true,
      prefetchThreshold: config.prefetchThreshold ?? 0.7,
      levels: {
        memory: {
          name: 'memory',
          type: 'MEMORY',
          ttl: 3600,
          maxSize: 1000,
          evictionPolicy: 'LRU',
          priority: 1,
          writeThrough: true,
          readThrough: true
        },
        redis: {
          name: 'redis',
          type: 'REDIS',
          ttl: 7200,
          maxSize: 10000,
          evictionPolicy: 'LRU',
          priority: 2,
          writeThrough: true,
          readThrough: true
        },
        ...config.levels
      }
    };

    // Initialize Redis client
    this.redisClient = new Redis(this.config.redis as RedisOptions);
    this.redisClient.on('error', (error) => {
      console.error('[AdvancedMultiLevelCache] Redis connection error:', error);
    });

    // Initialize cache nodes
    this.initializeCacheNodes();
    
    // Start adaptive cache management
    if (this.config.memory?.adaptiveSize) {
      setInterval(() => this.adjustCacheSize(), 60000); // Every minute
    }

    // Start prefetching if enabled
    if (this.config.enablePrefetching) {
      setInterval(() => this.processPrefetchQueue(), 5000); // Every 5 seconds
    }
  }

  private initializeCacheNodes(): void {
    for (const [name, level] of Object.entries(this.config.levels!)) {
      const storage = new LRUCache<string, CacheEntry<any>>({
        max: level.maxSize,
        ttl: level.ttl * 1000,
        allowStale: false,
        updateAgeOnGet: true
      });

      this.cacheNodes.set(name, {
        level,
        storage,
        stats: {
          hits: 0,
          misses: 0,
          writes: 0,
          evictions: 0,
          size: 0,
          memoryUsage: 0,
          compressionRatio: 0,
          averageAccessTime: 0,
          lastUpdated: new Date()
        }
      });
    }
  }

  private getSortedLevels(): string[] {
    return Array.from(this.cacheNodes.entries())
      .sort((a, b) => a[1].level.priority - b[1].level.priority)
      .map(([name]) => name);
  }

  private async serializeValue(value: any): Promise<string> {
    let serialized = JSON.stringify(value);
    
    if (this.config.enableCompression) {
      const compressed = await gzip(Buffer.from(serialized));
      serialized = compressed.toString('base64');
    }
    
    // Note: Encryption is disabled until security framework is implemented
    return serialized;
  }

  private async deserializeValue<T>(value: string): Promise<T> {
    let deserialized = value;
    
    // Note: Encryption is disabled until security framework is implemented
    
    if (this.config.enableCompression) {
      const decompressed = await gunzip(Buffer.from(deserialized, 'base64'));
      deserialized = decompressed.toString();
    }
    
    return JSON.parse(deserialized);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) return false;
    // TTL is already in milliseconds, no need to multiply by 1000
    return Date.now() - entry.timestamp.getTime() > entry.ttl;
  }

  private recordAccess(key: string, levelName: string, entry?: CacheEntry<any>): void {
    const node = this.cacheNodes.get(levelName);
    if (node && entry) {
      entry.accessCount++;
      entry.metadata = {
        ...entry.metadata,
        lastAccessed: new Date()
      };
    }
  }

  private recordOperation(operation: {
    type: 'GET' | 'SET' | 'DELETE' | 'CLEAR';
    key?: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    fromLevel?: string;
  }): void {
    if (!this.config.analyticsEnabled) return;

    const now = Date.now();
    if (operation.type === 'GET') {
      if (operation.success) {
        this.analytics.hitRateTrend.push(1);
        this.analytics.missRateTrend.push(0);
        this.analytics.hits++;
      } else {
        this.analytics.hitRateTrend.push(0);
        this.analytics.missRateTrend.push(1);
        this.analytics.misses++;
      }
    }

    // Keep trends at reasonable size
    const maxTrendLength = 100;
    if (this.analytics.hitRateTrend.length > maxTrendLength) {
      this.analytics.hitRateTrend = this.analytics.hitRateTrend.slice(-maxTrendLength);
      this.analytics.missRateTrend = this.analytics.missRateTrend.slice(-maxTrendLength);
      this.analytics.evictionRateTrend = this.analytics.evictionRateTrend.slice(-maxTrendLength);
    }

    // Update node stats
    if (operation.fromLevel) {
      const node = this.cacheNodes.get(operation.fromLevel);
      if (node) {
        if (operation.type === 'GET') {
          operation.success ? node.stats.hits++ : node.stats.misses++;
        } else if (operation.type === 'SET') {
          node.stats.writes++;
        }
        node.stats.lastUpdated = new Date();
        node.stats.averageAccessTime = operation.duration;
      }
    }
  }

  private async ensureCapacity(node: CacheNode): Promise<void> {
    if (node.storage.size >= node.level.maxSize) {
      // Find least recently used items
      const entries = Array.from(node.storage.entries() || [])
        .sort((a, b) => {
          const aLastAccessed = (a[1].metadata?.lastAccessed as Date)?.getTime() || 0;
          const bLastAccessed = (b[1].metadata?.lastAccessed as Date)?.getTime() || 0;
          return aLastAccessed - bLastAccessed;
        });

      // Remove 10% of oldest entries
      const removeCount = Math.ceil(node.level.maxSize * 0.1);
      for (let i = 0; i < removeCount && i < entries.length; i++) {
        node.storage.delete(entries[i][0]);
        node.stats.evictions++;
      }

      this.analytics.evictionRateTrend.push(removeCount);
    } else {
      this.analytics.evictionRateTrend.push(0);
    }
  }

  private async adjustCacheSize(): Promise<void> {
    for (const [name, node] of this.cacheNodes) {
      const hitRate = node.stats.hits / (node.stats.hits + node.stats.misses);
      const currentSize = node.storage.max;
      
      if (hitRate < this.config.memory?.adaptiveThreshold!) {
        // Increase cache size if hit rate is low
        const newSize = Math.min(currentSize * 1.2, node.level.maxSize);
        // Create new LRU cache with increased size
        const newStorage = new LRUCache<string, CacheEntry<any>>({
          max: newSize,
          ttl: node.level.ttl * 1000,
          allowStale: false,
          updateAgeOnGet: true
        });
        
        // Copy existing entries
        for (const [key, value] of node.storage.entries()) {
          newStorage.set(key, value);
        }
        
        // Update node storage
        node.storage = newStorage;
        console.log(`[AdvancedMultiLevelCache] Increased cache size for ${name} to ${newSize}`);
      } else if (node.stats.evictions === 0 && node.storage.size < currentSize * 0.7) {
        // Decrease cache size if it's underutilized
        const newSize = Math.max(currentSize * 0.8, 100);
        // Create new LRU cache with decreased size
        const newStorage = new LRUCache<string, CacheEntry<any>>({
          max: newSize,
          ttl: node.level.ttl * 1000,
          allowStale: false,
          updateAgeOnGet: true
        });
        
        // Copy existing entries
        for (const [key, value] of node.storage.entries()) {
          newStorage.set(key, value);
        }
        
        // Update node storage
        node.storage = newStorage;
        console.log(`[AdvancedMultiLevelCache] Decreased cache size for ${name} to ${newSize}`);
      }
    }
  }

  private updateAccessPattern(key: string): void {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || {
      key,
      timestamp: now,
      frequency: 0,
      lastAccess: now
    };

    const timeDiff = now - pattern.lastAccess;
    pattern.frequency = pattern.frequency * 0.95 + 1; // Decay old frequency
    pattern.lastAccess = now;

    // Predict next access based on access patterns
    if (timeDiff > 0) {
      pattern.predictedNextAccess = now + timeDiff;
      
      // Add to prefetch queue if prediction confidence is high
      if (this.config.enablePrefetching && 
          pattern.frequency > this.config.prefetchThreshold! &&
          !this.prefetchQueue.has(key)) {
        this.prefetchQueue.add(key);
      }
    }

    this.accessPatterns.set(key, pattern);
  }

  private async processPrefetchQueue(): Promise<void> {
    const now = Date.now();
    
    for (const key of this.prefetchQueue) {
      const pattern = this.accessPatterns.get(key);
      if (!pattern) continue;

      // Check if it's time to prefetch
      if (pattern.predictedNextAccess && pattern.predictedNextAccess - now < 5000) {
        // Prefetch from Redis to memory cache
        const value = await this.redisClient.get(key);
        if (value) {
          const node = this.cacheNodes.get('memory');
          if (node) {
            const entry: CacheEntry<any> = {
              key,
              value,
              timestamp: new Date(),
              ttl: node.level.ttl,
              accessCount: 0,
              metadata: {
                lastAccessed: new Date(),
                prefetched: true
              }
            };
            node.storage.set(key, entry);
          }
        }
        this.prefetchQueue.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    // Update access patterns for predictive prefetching
    this.updateAccessPattern(key);
    
    // Try each cache level in priority order
    const sortedLevels = this.getSortedLevels();
    
    for (let i = 0; i < sortedLevels.length; i++) {
      const levelName = sortedLevels[i];
      const node = this.cacheNodes.get(levelName);
      if (!node) continue;

      const entry = node.storage.get(key);
      if (entry && !this.isExpired(entry)) {
        // Record access pattern
        this.recordAccess(key, levelName, entry);
        
        // Deserialize and return
        const result = await this.deserializeValue<T>(entry.value);
        
        // Record operation (this will increment hits)
        this.recordOperation({
          type: 'GET',
          key,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          success: true,
          fromLevel: levelName
        });
        
        return result;
      } else if (entry) {
        // Expired - remove it
        node.storage.delete(key);
        node.stats.evictions++;
        break;
      }
      
      // Record miss for this level
      this.recordOperation({
        type: 'GET',
        key,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        fromLevel: levelName
      });
    }
    
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    const serializedValue = await this.serializeValue(value);
    
    // Set in all levels
    for (const node of this.cacheNodes.values()) {
      // Create cache entry
      const entry: CacheEntry<any> = {
        key,
        value: serializedValue,
        timestamp: new Date(),
        ttl: ttl || node.level.ttl,
        accessCount: 1,
        metadata: {
          lastAccessed: new Date()
        }
      };

      // Store in level
      node.storage.set(key, entry);
      node.stats.writes++;

      // Ensure capacity
      await this.ensureCapacity(node);
    }

    // Record operation
    this.recordOperation({
      type: 'SET',
      key,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      success: true
    });
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    
    // Delete from all levels
    for (const node of this.cacheNodes.values()) {
      node.storage.delete(key);
    }

    // Record operation
    this.recordOperation({
      type: 'DELETE',
      key,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      success: true
    });
  }

  async clear(): Promise<void> {
    const startTime = Date.now();
    
    // Clear all levels
    for (const node of this.cacheNodes.values()) {
      node.storage.clear();
    }

    // Record operation
    this.recordOperation({
      type: 'CLEAR',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      success: true
    });
  }

  async getStats(): Promise<AdvancedCacheStats> {
    const stats: AdvancedCacheStats = {
      levels: {},
      analytics: this.analytics,
      totalMemoryUsage: 0,
      totalEntries: 0,
      lastUpdated: new Date()
    };

    // Garante que todos os níveis configurados estejam presentes
    for (const [name, level] of Object.entries(this.config.levels!)) {
      const node = this.cacheNodes.get(name);
      stats.levels[name] = {
        hits: node?.stats.hits || 0,
        misses: node?.stats.misses || 0,
        evictions: node?.stats.evictions || 0,
        memoryUsage: node?.storage.size || 0,
        size: node?.storage.size || 0
      };
      stats.totalMemoryUsage += node?.storage.size || 0;
      stats.totalEntries += node?.storage.size || 0;
    }

    // Garante que stats.levels nunca seja undefined
    if (!stats.levels) stats.levels = {};

    return stats;
  }

  async shutdown(): Promise<void> {
    try {
      await this.redisClient.quit();
      for (const node of this.cacheNodes.values()) {
        node.storage.clear();
      }
    } catch (error) {
      console.error('[AdvancedMultiLevelCache] Error during shutdown:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; missRate: number } {
    let totalSize = 0;
    for (const node of this.cacheNodes.values()) {
      totalSize += node.storage.size;
    }

    const totalOps = this.analytics.hits + this.analytics.misses;
    const hitRate = totalOps > 0 ? this.analytics.hits / totalOps : 0;
    const missRate = totalOps > 0 ? this.analytics.misses / totalOps : 0;

    return {
      size: totalSize,
      hitRate,
      missRate
    };
  }

  /**
   * Get analytics data
   */
  getAnalytics(): {
    totalOperations: number;
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
  } {
    const totalOps = this.analytics.hits + this.analytics.misses;
    const hitRate = totalOps > 0 ? this.analytics.hits / totalOps : 0;
    const avgResponseTime = this.analytics.averageLatency || 0;

    return {
      totalOperations: totalOps,
      hits: this.analytics.hits,
      misses: this.analytics.misses,
      hitRate,
      avgResponseTime
    };
  }
}