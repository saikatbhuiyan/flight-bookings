import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Module({
  imports: [RedisModule],
  exports: [RedisModule],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
