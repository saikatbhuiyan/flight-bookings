import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import {
  Public,
  RabbitMQHealthIndicator,
  RedisHealthIndicator,
} from '@app/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Public()
@Controller('health')
export class GatewayHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly rabbitmq: RabbitMQHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check overall Gateway health' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unhealthy',
  })
  check() {
    return this.readiness();
  }

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check liveness' })
  @ApiResponse({ status: 200, description: 'Gateway is alive' })
  liveness() {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Check readiness' })
  @ApiResponse({
    status: 200,
    description: 'Gateway is ready to handle requests',
  })
  @ApiResponse({ status: 503, description: 'Gateway is not ready' })
  readiness() {
    return this.health.check([
      // Dependencies
      () => this.rabbitmq.isHealthy('rabbitmq'),
      () => this.redis.isHealthy('redis'),
      // Memory
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }
}
