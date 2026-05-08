import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    const configuredHost =
      this.configService.get<string>('REDIS_HOST') || this.configService.get<string>('redis.host', '127.0.0.1');
    const host = this.resolveHost(configuredHost);
    const port = this.configService.get<number>('REDIS_PORT') || this.configService.get<number>('redis.port', 6379);

    this.client = new Redis({
      host,
      port,
      password: this.configService.get<string>('REDIS_PASSWORD') || this.configService.get<string>('redis.password'),
    });

    this.client.on('error', (error) => {
      this.logger.error(
        `Redis connection error (${host}:${port})`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onApplicationShutdown() {
    await this.client.quit();
  }

  private resolveHost(configuredHost: string): string {
    if (configuredHost !== 'redis') {
      return configuredHost;
    }

    if (this.isRunningInContainer()) {
      return configuredHost;
    }

    this.logger.warn('REDIS_HOST=redis detected outside Docker; falling back to 127.0.0.1 for local development');
    return '127.0.0.1';
  }

  private isRunningInContainer(): boolean {
    return existsSync('/.dockerenv');
  }
}
