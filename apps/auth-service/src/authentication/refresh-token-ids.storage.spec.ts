jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { ConfigService } from '@nestjs/config';
import { InvalidateRefreshTokenError } from '@app/common/errors';
import { RedisService } from '@app/common/redis/redis.service';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';

describe('RefreshTokenIdsStorage', () => {
  let storage: RefreshTokenIdsStorage;
  let redisClient: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    redisClient = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const redisService = {
      getClient: jest.fn(() => redisClient),
    } as unknown as RedisService;

    const configService = {
      get: jest.fn((key: string) => (key === 'jwt.refreshTokenTtl' ? 604800 : undefined)),
    } as unknown as ConfigService;

    storage = new RefreshTokenIdsStorage(redisService, configService);
  });

  it('stores refresh token ids using the user and device key with ttl', async () => {
    await expect(storage.insert(42, 'rt-1', 'device-1')).resolves.toBeUndefined();

    expect(redisClient.set).toHaveBeenCalledWith('refresh-token:42:device-1', 'rt-1', 'EX', 604800);
  });

  it('retrieves the stored refresh token id for a device', async () => {
    redisClient.get.mockResolvedValue('rt-1');

    await expect(storage.getToken(42, 'device-1')).resolves.toBe('rt-1');
    expect(redisClient.get).toHaveBeenCalledWith('refresh-token:42:device-1');
  });

  it('validates matching refresh token ids', async () => {
    redisClient.get.mockResolvedValue('rt-1');

    await expect(storage.validate(42, 'rt-1', 'device-1')).resolves.toBe(true);
  });

  it('rejects missing or mismatched refresh token ids', async () => {
    redisClient.get.mockResolvedValue('different-token');

    await expect(storage.validate(42, 'rt-1', 'device-1')).rejects.toThrow(InvalidateRefreshTokenError);
  });

  it('deletes refresh token ids on invalidation', async () => {
    await expect(storage.invalidate(42, 'device-1')).resolves.toBeUndefined();

    expect(redisClient.del).toHaveBeenCalledWith('refresh-token:42:device-1');
  });
});
