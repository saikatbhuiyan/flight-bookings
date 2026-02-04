import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/common';
import { RateLimiterGuard } from './rate-limiter.guard';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
    imports: [ConfigModule, RedisModule],
    providers: [RateLimiterService, RateLimiterGuard],
    exports: [RateLimiterService, RateLimiterGuard],
})
export class RateLimiterModule { }