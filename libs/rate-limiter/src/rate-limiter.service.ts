import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitInfo,
} from './interfaces/rate-limiter.interface';
import { RedisService } from '@app/common';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly defaultConfig: RateLimitConfig;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Load default config from environment
    this.defaultConfig = {
      points: this.configService.get<number>('RATE_LIMIT_POINTS', 100),
      duration: this.configService.get<number>('RATE_LIMIT_DURATION', 60),
      blockDuration: this.configService.get<number>(
        'RATE_LIMIT_BLOCK_DURATION',
        120,
      ),
      keyPrefix: this.configService.get<string>(
        'RATE_LIMIT_KEY_PREFIX',
        'ratelimit',
      ),
    };
  }

  /**
   * Check if request is allowed based on rate limit
   * Uses Sliding Window Log algorithm with Redis
   *
   * @param key - Unique identifier (user ID, IP, etc.)
   * @param config - Rate limit configuration
   * @returns Result indicating if request is allowed and rate limit info
   */
  async consume(
    key: string,
    config?: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redis = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - finalConfig.duration * 1000;
    const redisKey = `${finalConfig.keyPrefix}:${key}`;
    const blockKey = `${redisKey}:blocked`;

    try {
      // Check if currently blocked
      const blockedUntil = await redis.get(blockKey);
      if (blockedUntil) {
        const blockedTimestamp = parseInt(blockedUntil, 10);
        if (now < blockedTimestamp) {
          const retryAfter = Math.ceil((blockedTimestamp - now) / 1000);
          this.logger.debug(
            `Request blocked for key: ${key}, retry after ${retryAfter}s`,
          );

          return {
            allowed: false,
            info: {
              limit: finalConfig.points,
              remaining: 0,
              reset: Math.floor(blockedTimestamp / 1000),
              retryAfter,
            },
          };
        }
        // Block expired, remove it
        await redis.del(blockKey);
      }

      // Use Lua script for atomic operations
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])
        
        -- Remove old entries outside the time window
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
        
        -- Count current entries
        local current = redis.call('ZCARD', key)
        
        if current < limit then
          -- Add new entry with timestamp as both score and value
          redis.call('ZADD', key, now, now .. ':' .. math.random())
          redis.call('EXPIRE', key, ttl)
          return {1, current + 1}
        else
          return {0, current}
        end
      `;

      const result = (await redis.eval(
        luaScript,
        1,
        redisKey,
        now.toString(),
        windowStart.toString(),
        finalConfig.points.toString(),
        (finalConfig.duration + 1).toString(),
      )) as [number, number];

      const [allowed, current] = result;
      const remaining = Math.max(0, finalConfig.points - current);
      const resetTime = Math.floor((now + finalConfig.duration * 1000) / 1000);

      // If rate limit exceeded, set block
      if (!allowed) {
        const blockDuration =
          (finalConfig.blockDuration || finalConfig.duration) * 1000;
        const blockedUntil = now + blockDuration;
        await redis.setex(
          blockKey,
          Math.ceil(blockDuration / 1000),
          blockedUntil.toString(),
        );

        this.logger.warn(
          `Rate limit exceeded for key: ${key}, blocked for ${Math.ceil(blockDuration / 1000)}s`,
        );

        return {
          allowed: false,
          info: {
            limit: finalConfig.points,
            remaining: 0,
            reset: resetTime,
            retryAfter: Math.ceil(blockDuration / 1000),
          },
        };
      }

      this.logger.debug(
        `Rate limit check passed for key: ${key}, remaining: ${remaining}/${finalConfig.points}`,
      );

      return {
        allowed: true,
        info: {
          limit: finalConfig.points,
          remaining,
          reset: resetTime,
        },
      };
    } catch (error) {
      this.logger.error(`Rate limiter error for key: ${key}`, error.stack);
      // Fail open - allow request if Redis is down (graceful degradation)
      return {
        allowed: true,
        info: {
          limit: finalConfig.points,
          remaining: finalConfig.points,
          reset: Math.floor((now + finalConfig.duration * 1000) / 1000),
        },
      };
    }
  }

  /**
   * Get current rate limit status without consuming
   *
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   * @returns Current rate limit status
   */
  async getStatus(
    key: string,
    config?: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redis = this.redisService.getClient();
    const now = Date.now();
    const windowStart = now - finalConfig.duration * 1000;
    const redisKey = `${finalConfig.keyPrefix}:${key}`;

    try {
      // Remove expired entries
      await redis.zremrangebyscore(redisKey, 0, windowStart);

      // Get current count
      const current = await redis.zcard(redisKey);
      const remaining = Math.max(0, finalConfig.points - current);

      return {
        limit: finalConfig.points,
        remaining,
        reset: Math.floor((now + finalConfig.duration * 1000) / 1000),
      };
    } catch (error) {
      this.logger.error(
        `Error getting rate limit status for key: ${key}`,
        error.stack,
      );
      return {
        limit: finalConfig.points,
        remaining: finalConfig.points,
        reset: Math.floor((now + finalConfig.duration * 1000) / 1000),
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   *
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   */
  async reset(key: string, config?: RateLimitConfig): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redis = this.redisService.getClient();
    const redisKey = `${finalConfig.keyPrefix}:${key}`;
    const blockKey = `${redisKey}:blocked`;

    try {
      await Promise.all([redis.del(redisKey), redis.del(blockKey)]);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error resetting rate limit for key: ${key}`,
        error.stack,
      );
    }
  }

  /**
   * Block a key manually for a specific duration
   *
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   * @param durationSeconds - Block duration in seconds (optional)
   */
  async block(
    key: string,
    config?: RateLimitConfig,
    durationSeconds?: number,
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redis = this.redisService.getClient();
    const redisKey = `${finalConfig.keyPrefix}:${key}`;
    const blockKey = `${redisKey}:blocked`;
    const duration =
      durationSeconds || finalConfig.blockDuration || finalConfig.duration;
    const blockedUntil = Date.now() + duration * 1000;

    try {
      await redis.setex(blockKey, duration, blockedUntil.toString());
      this.logger.warn(`Manually blocked key: ${key} for ${duration}s`);
    } catch (error) {
      this.logger.error(`Error blocking key: ${key}`, error.stack);
    }
  }

  /**
   * Unblock a key manually
   *
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   */
  async unblock(key: string, config?: RateLimitConfig): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redis = this.redisService.getClient();
    const redisKey = `${finalConfig.keyPrefix}:${key}`;
    const blockKey = `${redisKey}:blocked`;

    try {
      await redis.del(blockKey);
      this.logger.log(`Manually unblocked key: ${key}`);
    } catch (error) {
      this.logger.error(`Error unblocking key: ${key}`, error.stack);
    }
  }

  /**
   * Get all rate limited keys (for monitoring)
   * Warning: Use with caution in production, can be expensive
   */
  async getAllKeys(prefix?: string): Promise<string[]> {
    const redis = this.redisService.getClient();
    const pattern = `${prefix || this.defaultConfig.keyPrefix}:*`;

    try {
      const keys = await redis.keys(pattern);
      return keys;
    } catch (error) {
      this.logger.error(
        `Error getting all keys with pattern: ${pattern}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Delete all rate limit data for a pattern (use with caution!)
   */
  async deletePattern(pattern: string): Promise<number> {
    const redis = this.redisService.getClient();

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      const deleted = await redis.del(...keys);
      this.logger.warn(`Deleted ${deleted} keys matching pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(
        `Error deleting keys with pattern: ${pattern}`,
        error.stack,
      );
      return 0;
    }
  }
}
