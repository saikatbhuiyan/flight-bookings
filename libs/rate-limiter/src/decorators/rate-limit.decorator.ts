import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../interfaces/rate-limiter.interface';

export const RATE_LIMIT_KEY = 'rate_limit_config';

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

export const SkipRateLimit = () => SetMetadata('skipRateLimit', true);
