import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [TerminusModule, ConfigModule, RedisModule],
    controllers: [HealthController],
    providers: [RabbitMQHealthIndicator, RedisHealthIndicator],
    exports: [RabbitMQHealthIndicator, RedisHealthIndicator, TerminusModule],
})
export class HealthModule { }
