import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly rabbitmq: RabbitMQHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  check() {
    return this.readiness();
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Database
      () => this.db.pingCheck('database'),
      // Dependencies
      () => this.rabbitmq.isHealthy('rabbitmq'),
      () => this.redis.isHealthy('redis'),
      // Memory
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }
}
