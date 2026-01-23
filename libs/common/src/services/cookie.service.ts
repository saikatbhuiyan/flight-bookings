import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Parse and validate TTLs with multiple layers of safety
    const rawAccess = this.configService.get<number | string>('jwt.accessTokenTtl');
    const rawRefresh = this.configService.get<number | string>('jwt.refreshTokenTtl');

    const parsedAccess = typeof rawAccess === 'string' ? parseInt(rawAccess, 10) : rawAccess;
    const parsedRefresh = typeof rawRefresh === 'string' ? parseInt(rawRefresh, 10) : rawRefresh;

    this.accessTokenTtl = (!parsedAccess || isNaN(parsedAccess as number)) ? 3600000 : (parsedAccess as number) * 1000;
    this.refreshTokenTtl = (!parsedRefresh || isNaN(parsedRefresh as number)) ? 604800000 : (parsedRefresh as number) * 1000;

    console.log(`[CookieService] Initialized. AccessTokenTtl: ${this.accessTokenTtl}, IsProduction: ${this.isProduction}`);
  }

  /**
   * Set per-device access token cookie
   */
  setAccessToken(res: Response, token: string, deviceId: string) {
    // Final defensive check before calling res.cookie
    const maxAge = (typeof this.accessTokenTtl === 'number' && !isNaN(this.accessTokenTtl))
      ? this.accessTokenTtl
      : 3600000;

    res.cookie(`accessToken_${deviceId}`, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge: maxAge,
    });
  }

  /**
   * Set per-device refresh token cookie
   */
  setRefreshToken(res: Response, token: string, deviceId: string) {
    res.cookie(`refreshToken_${deviceId}`, token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge: this.refreshTokenTtl,
    });
  }

  /**
   * Clear cookies for a specific device
   */
  clearAuthCookies(res: Response, deviceId: string) {
    res.clearCookie(`accessToken_${deviceId}`, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
    });
    res.clearCookie(`refreshToken_${deviceId}`, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
    });
  }
}
