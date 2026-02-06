import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host:
        this.configService.get<string>('REDIS_HOST') ||
        this.configService.get<string>('redis.host', '127.0.0.1'),
      port:
        this.configService.get<number>('REDIS_PORT') ||
        this.configService.get<number>('redis.port', 6379),
      password:
        this.configService.get<string>('REDIS_PASSWORD') ||
        this.configService.get<string>('redis.password'),
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onApplicationShutdown() {
    await this.client.quit();
  }
}
