import { registerAs } from '@nestjs/config';

/**
 * Helper to parse environment variable durations into seconds.
 * Supports basic suffixes: s (seconds), m (minutes), h (hours), d (days).
 * Default is seconds if no suffix is provided.
 */
function parseDurationToSeconds(duration: string | undefined, defaultSeconds: number): number {
    if (!duration) return defaultSeconds;

    const matches = duration.match(/^(\d+)([smhd]?)$/);
    if (!matches) {
        // If it's something like "15m" but doesn't match the simple regex (e.g. "1.5m"), 
        // or if it's purely a string duration that Nest JWT uses, we might need a more robust parser.
        // For now, we'll try to extract the number if possible or fallback.
        const numericValue = parseInt(duration, 10);
        return isNaN(numericValue) ? defaultSeconds : numericValue;
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return value;
    }
}

export default registerAs('jwt', () => ({
    secret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenTtl: parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRATION, 3600),
    refreshTokenTtl: parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRATION, 604800),
    tokenAudience: process.env.JWT_TOKEN_AUDIENCE,
    tokenIssuer: process.env.JWT_TOKEN_ISSUER,
}));
