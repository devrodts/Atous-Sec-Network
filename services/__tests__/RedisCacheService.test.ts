import { RedisCacheService } from '../RedisCacheService';
import Redis from 'ioredis';

jest.mock('ioredis');
const mockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let redisInstance: jest.Mocked<Redis>;

  beforeEach(() => {
    // Create a new mock instance for each test
    redisInstance = new mockedRedis() as jest.Mocked<Redis>;
    service = new RedisCacheService();
    (service as any).redisClient = redisInstance; // Inject the mock instance
    jest.clearAllMocks();
  });

  it('should set a value in Redis', async () => {
    redisInstance.set.mockResolvedValueOnce('OK');
    await service.set('key1', 'value1', 60);
    expect(redisInstance.set).toHaveBeenCalledWith('key1', 'value1', 'EX', 60);
  });

  it('should get a value from Redis', async () => {
    redisInstance.get.mockResolvedValueOnce('value1');
    const value = await service.get('key1');
    expect(value).toBe('value1');
    expect(redisInstance.get).toHaveBeenCalledWith('key1');
  });

  it('should delete a value from Redis', async () => {
    redisInstance.del.mockResolvedValueOnce(1);
    await service.del('key1');
    expect(redisInstance.del).toHaveBeenCalledWith('key1');
  });

  it('should return null if key does not exist', async () => {
    redisInstance.get.mockResolvedValueOnce(null);
    const value = await service.get('nonexistentKey');
    expect(value).toBeNull();
  });

  it('should handle Redis connection errors gracefully on set', async () => {
    redisInstance.set.mockRejectedValueOnce(new Error('Connection error'));
    await expect(service.set('key2', 'value2', 60)).resolves.toBeUndefined(); // Should not throw
    expect(redisInstance.set).toHaveBeenCalledTimes(1);
  });

  it('should handle Redis connection errors gracefully on get', async () => {
    redisInstance.get.mockRejectedValueOnce(new Error('Connection error'));
    await expect(service.get('key3')).resolves.toBeNull(); // Should not throw, should return null
    expect(redisInstance.get).toHaveBeenCalledTimes(1);
  });

  it('should handle Redis connection errors gracefully on del', async () => {
    redisInstance.del.mockRejectedValueOnce(new Error('Connection error'));
    await expect(service.del('key4')).resolves.toBeUndefined(); // Should not throw
    expect(redisInstance.del).toHaveBeenCalledTimes(1);
  });

  it('should set a value without TTL', async () => {
    redisInstance.set.mockResolvedValueOnce('OK');
    await service.set('key5', 'value5');
    expect(redisInstance.set).toHaveBeenCalledWith('key5', 'value5');
  });
});
