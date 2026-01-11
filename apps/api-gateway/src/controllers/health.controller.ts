import { Controller, Get } from '@nestjs/common';
import {
    HealthCheckService,
    MemoryHealthIndicator,
    HealthCheck,
} from '@nestjs/terminus';
import { Public, RabbitMQHealthIndicator, RedisHealthIndicator } from '@app/common';

@Public()
@Controller('health')
export class GatewayHealthController {
    constructor(
        private readonly health: HealthCheckService,
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
            // Dependencies
            () => this.rabbitmq.isHealthy('rabbitmq'),
            () => this.redis.isHealthy('redis'),
            // Memory
            () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
            () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        ]);
    }
}
