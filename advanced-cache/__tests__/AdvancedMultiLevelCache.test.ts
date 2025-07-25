import { AdvancedMultiLevelCache } from '../AdvancedMultiLevelCache';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

// Mock Redis and LRUCache
jest.mock('ioredis');
jest.mock('lru-cache');

describe('AdvancedMultiLevelCache', () => {
  let cache: AdvancedMultiLevelCache;
  let mockRedis: jest.Mocked<Redis>;
  let mockLruCache: jest.Mocked<LRUCache<string, any>>;
  let mockLruSize: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Redis methods
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      flushdb: jest.fn().mockResolvedValue('OK'),
      info: jest.fn().mockResolvedValue('# Server\ndb0:keys=0'),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK')
    } as unknown as jest.Mocked<Redis>;

    // Setup size mock
    mockLruSize = jest.fn().mockReturnValue(0);

    // Mock LRUCache methods
    mockLruCache = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getRemainingTTL: jest.fn(),
      purgeStale: jest.fn(),
      has: jest.fn(),
      peek: jest.fn(),
      load: jest.fn(),
      dump: jest.fn(),
      forEach: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      entries: jest.fn(),
      find: jest.fn(),
      rforEach: jest.fn(),
      rkeys: jest.fn(),
      rvalues: jest.fn(),
      rentries: jest.fn(),
      get size() { return mockLruSize(); }
    } as unknown as jest.Mocked<LRUCache<string, any>>;

    // Ensure the mocks are used by the class
    ((LRUCache as unknown) as jest.Mock).mockImplementation(() => mockLruCache);
    ((Redis as unknown) as jest.Mock).mockImplementation(() => mockRedis);

    cache = new AdvancedMultiLevelCache();
  });

  describe('Cache Level Management', () => {
    it('should initialize cache levels with correct priorities', async () => {
      const customConfig = {
        levels: {
          l1: {
            name: 'l1',
            type: "MEMORY",
            ttl: 60,
            maxSize: 100,
            evictionPolicy: 'LRU',
            priority: 1,
            writeThrough: true,
            readThrough: true
          },
          l2: {
            name: 'l2',
            type: "MEMORY",
            ttl: 300,
            maxSize: 500,
            evictionPolicy: 'LRU',
            priority: 2,
            writeThrough: true,
            readThrough: true
          }
        }
      };

      const customCache = new AdvancedMultiLevelCache(customConfig);
      const stats = await customCache.getStats();
      expect(Object.keys(stats.levels)).toContain('l1');
      expect(Object.keys(stats.levels)).toContain('l2');
    });

    it('should respect cache level priorities when getting values', async () => {
      const key = 'testKey';
      const value = { data: 'testValue' };
      const entry = {
        key,
        value: JSON.stringify(value),
        timestamp: new Date(),
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date() }
      };

      // Setup mock to return value from memory (priority 1)
      mockLruCache.get.mockReturnValueOnce(entry);

      const result = await cache.get(key);
      expect(result).toEqual(value);
      expect(mockLruCache.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Compression Support', () => {
    it('should compress values when compression is enabled', async () => {
      const compressedCache = new AdvancedMultiLevelCache({
        enableCompression: true
      });

      const key = 'compressedKey';
      const value = { data: 'test'.repeat(100) }; // Create larger data to compress

      await compressedCache.set(key, value);

      // The compressed value should be stored in base64 format
      const storedEntry = mockLruCache.set.mock.calls[0][1];
      expect(storedEntry.value).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    });

    it('should decompress values correctly', async () => {
      const compressedCache = new AdvancedMultiLevelCache({
        enableCompression: true
      });

      const key = 'compressedKey';
      const value = { data: 'test'.repeat(100) };

      // Compress and store value
      const compressed = await gzipAsync(Buffer.from(JSON.stringify(value)));
      const base64Value = compressed.toString('base64');

      mockLruCache.get.mockReturnValueOnce({
        key,
        value: base64Value,
        timestamp: new Date(),
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date() }
      });

      const result = await compressedCache.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('Cache Entry Management', () => {
    it('should track access counts and timestamps', async () => {
      const key = 'accessKey';
      const value = { data: 'test' };
      const initialTimestamp = new Date();

      // Store initial entry
      await cache.set(key, value);
      const initialEntry = mockLruCache.set.mock.calls[0][1];
      expect(initialEntry.accessCount).toBe(1);
      expect(initialEntry.metadata.lastAccessed).toBeInstanceOf(Date);
      expect(initialEntry.metadata.lastAccessed.getTime()).toBeGreaterThanOrEqual(initialTimestamp.getTime());

      // Setup mock for get
      mockLruCache.get.mockReturnValue(initialEntry);

      // Access the entry
      await cache.get(key);
      expect(initialEntry.accessCount).toBe(2);
      expect(initialEntry.metadata.lastAccessed.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should handle entry expiration correctly', async () => {
      const key = 'expiringKey';
      const value = { data: 'test' };
      const expiredEntry = {
        key,
        value: JSON.stringify(value),
        timestamp: new Date(Date.now() - 4000000), // Set timestamp in the past
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date(Date.now() - 4000000) }
      };

      mockLruCache.get.mockReturnValueOnce(expiredEntry);

      const result = await cache.get(key);
      expect(result).toBeNull();
      expect(mockLruCache.delete).toHaveBeenCalledWith(key);
    });

    it('should enforce capacity limits and evict entries correctly', async () => {
      mockLruSize.mockReturnValue(1000); // Mock cache at capacity
      // Mock entries para garantir que delete será chamado
      mockLruCache.entries.mockImplementation(function* () {
        yield ['oldKey', { key: 'oldKey', value: 'oldValue', timestamp: new Date(), ttl: 3600, accessCount: 1, metadata: { lastAccessed: new Date() } }];
      });

      const key = 'newKey';
      const value = { data: 'test' };

      await cache.set(key, value);

      // Should have tried to evict entries
      expect(mockLruCache.delete).toHaveBeenCalled();
      const stats = await cache.getStats();
      expect(stats.levels.memory.evictions).toBeGreaterThan(0);
    });
  });

  describe('Analytics and Statistics', () => {
    it('should track detailed cache statistics', async () => {
      const key = 'statsKey';
      const value = { data: 'test' };

      // Simule miss no primeiro get
      mockLruCache.get.mockReturnValueOnce(undefined); // Miss
      await cache.get(key);

      await cache.set(key, value);

      // Simule hit apenas na primeira chamada após o set
      mockLruCache.get.mockReturnValueOnce({
        key,
        value: JSON.stringify(value),
        timestamp: new Date(),
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date() }
      });
      mockLruCache.get.mockReturnValue(undefined); // Demais chamadas retornam undefined
      await cache.get(key);

      const stats = await cache.getStats();
      expect(stats.levels.memory.hits).toBe(1);
      expect(stats.levels.memory.misses).toBe(1);
      expect(stats.analytics.hitRateTrend).toContain(1);
      expect(stats.analytics.missRateTrend).toContain(1);
    });

    it('should maintain trend arrays at reasonable size', async () => {
      const key = 'trendKey';
      const value = { data: 'test' };
      const entry = {
        key,
        value: JSON.stringify(value),
        timestamp: new Date(),
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date() }
      };

      // Generate more than maxTrendLength operations
      mockLruCache.get.mockReturnValue(entry);
      for (let i = 0; i < 150; i++) {
        await cache.get(key);
      }

      const stats = await cache.getStats();
      expect(stats.analytics.hitRateTrend.length).toBeLessThanOrEqual(100);
      expect(stats.analytics.missRateTrend.length).toBeLessThanOrEqual(100);
      expect(stats.analytics.evictionRateTrend.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const key = 'errorKey';
      const value = { data: 'test' };
      const entry = {
        key,
        value: JSON.stringify(value),
        timestamp: new Date(),
        ttl: 3600,
        accessCount: 1,
        metadata: { lastAccessed: new Date() }
      };

      // Simulate Redis error but successful memory cache operation
      mockLruCache.get.mockReturnValueOnce(entry);
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection lost'));

      const result = await cache.get(key);
      expect(result).toEqual(value); // Should still get value from memory cache
    });

    it('should handle serialization errors gracefully', async () => {
      const key = 'circularKey';
      const circular: any = { prop: null };
      circular.prop = circular; // Create circular reference

      await expect(cache.set(key, circular)).rejects.toThrow();
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should clear all cache levels on shutdown', async () => {
      await cache.shutdown();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockLruCache.clear).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      mockRedis.quit.mockRejectedValueOnce(new Error('Shutdown error'));
      await expect(cache.shutdown()).resolves.not.toThrow();
    });
  });
});
