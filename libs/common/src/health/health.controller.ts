import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators';

@ApiTags('Health')
@Public()
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
  @ApiOperation({ summary: 'Check overall system health' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
  check() {
    return this.readiness();
  }

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check liveness' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check readiness' })
  @ApiResponse({ status: 200, description: 'Application is ready to handle requests' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
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
