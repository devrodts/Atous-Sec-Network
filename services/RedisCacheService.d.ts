import { ICacheService, AdvancedCacheStats } from '../common-interfaces/BridgeTypes';
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
export declare class RedisCacheService implements ICacheService {
    private redis;
    private config;
    private stats;
    constructor(config: RedisCacheConfig);
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with optional TTL
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Delete key from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cache data
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<AdvancedCacheStats>;
    private _getKeyCount;
    private _getMemoryUsage;
    private _getConnectionStatus;
    /**
     * Set multiple values at once (pipeline)
     */
    setMultiple<T>(entries: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>): Promise<void>;
    /**
     * Get multiple values at once (pipeline)
     */
    getMultiple<T>(keys: string[]): Promise<Array<{
        key: string;
        value: T | null;
    }>>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Set TTL for existing key
     */
    expire(key: string, ttlMs: number): Promise<boolean>;
    /**
     * Get TTL for key
     */
    getTTL(key: string): Promise<number>;
    /**
     * Increment numeric value
     */
    increment(key: string, delta?: number): Promise<number>;
    /**
     * Get configuration
     */
    getConfig(): RedisCacheConfig;
    /**
     * Test connection
     */
    ping(): Promise<boolean>;
    /**
     * Disconnect from Redis
     */
    disconnect(): Promise<void>;
    /**
     * Get Redis client for advanced operations
     */
    getRedisClient(): Redis;
    connect(): Promise<void>;
    keys(pattern: string): Promise<string[]>;
}
//# sourceMappingURL=RedisCacheService.d.ts.map