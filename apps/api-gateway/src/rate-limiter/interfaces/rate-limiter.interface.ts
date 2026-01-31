export interface RateLimitConfig {
    points: number; // Number of requests
    duration: number; // Time window in seconds
    blockDuration?: number; // Block duration in seconds (default: duration)
    keyPrefix?: string; // Redis key prefix
    skipSuccessfulRequests?: boolean; // Don't count successful requests
    skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number; // Unix timestamp when the limit resets
    retryAfter?: number; // Seconds until retry (if blocked)
}

export interface RateLimitResult {
    allowed: boolean;
    info: RateLimitInfo;
}

export enum RateLimitType {
    GLOBAL = 'global',
    USER = 'user',
    IP = 'ip',
    API_KEY = 'api_key',
}
