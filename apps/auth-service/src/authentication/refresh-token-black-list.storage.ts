import { RedisService } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RefreshTokenBlacklist {
  private readonly blacklistTTL = 60 * 60 * 24 * 30;

  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    const client = this.redisService.getClient();
    if (!client) throw new Error('Redis client not initialized');
    return client;
  }

  async blacklistToken(tokenId: string, ttlInSeconds?: number) {
    await this.redis.set(
      `blacklist:${tokenId}`,
      '1',
      'EX',
      ttlInSeconds || this.blacklistTTL,
    );
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${tokenId}`);
    return result === '1';
  }
}
