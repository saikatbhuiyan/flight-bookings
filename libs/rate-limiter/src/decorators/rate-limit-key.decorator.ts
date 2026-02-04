import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get custom rate limit key from request
 * Can extract from user ID, API key, or custom logic
 * 
 * @example
 * @Get()
 * async getData(@RateLimitKey() key: string) {
 *   console.log('Rate limit key:', key);
 * }
 */
export const RateLimitKey = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();

        if (data) {
            // Custom key from request property
            return request[data];
        }

        // Default: use IP address
        return request.ip || request.connection.remoteAddress || 'unknown';
    },
);