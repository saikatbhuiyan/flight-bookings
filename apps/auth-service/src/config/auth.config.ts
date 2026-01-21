import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    secret: process.env.JWT_ACCESS_SECRET,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_EXPIRATION || '3600', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_EXPIRATION || '86400', 10),
    tokenAudience: process.env.JWT_TOKEN_AUDIENCE,
    tokenIssuer: process.env.JWT_TOKEN_ISSUER,
}));
