import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { firstValueFrom } from 'rxjs';
import {
  MessagePattern as MP,
  ApiResponseDto,
  Public,
  CurrentUser,
  ClientType,
  CookieService,
} from '@app/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly cookieService: CookieService,
  ) {}

  // --- REGISTER ---------------------------------------------------
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: any) {
    const result = await this.callService(MP.AUTH_REGISTER, registerDto);
    return ApiResponseDto.success(result, 'User registered successfully');
  }

  // --- LOGIN ------------------------------------------------------
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: any,
  ) {
    const { clientType = ClientType.WEB, deviceId } = loginDto;
    const ip = req.ip;

    const result = await this.callAuthService(MP.AUTH_LOGIN, {
      ...loginDto,
      ip,
    });

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, result.accessToken, deviceId);
      this.cookieService.setRefreshToken(res, result.refreshToken, deviceId);
      return { message: 'Login successful' };
    }

    return ApiResponseDto.success(result, 'Login successful');
  }

  // --- REFRESH TOKEN ---------------------------------------------
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto: any,
  ) {
    const { clientType = ClientType.WEB, deviceId } = refreshTokenDto;

    const refreshToken =
      clientType === ClientType.WEB
        ? req.cookies[`refreshToken_${deviceId}`]
        : refreshTokenDto.refreshToken;

    if (!refreshToken) throw new Error('Missing refresh token');

    const result = await this.callAuthService(MP.AUTH_REFRESH, {
      ...refreshTokenDto,
      refreshToken,
    });

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, result.accessToken, deviceId);
      this.cookieService.setRefreshToken(res, result.refreshToken, deviceId);
      return { message: 'Token refreshed successfully' };
    }

    return ApiResponseDto.success(result, 'Token refreshed successfully');
  }

  // --- SIGN OUT ---------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Body() payload: any,
  ) {
    const { clientType = ClientType.WEB, deviceId } = payload;

    await this.callService(MP.AUTH_SIGNOUT, payload);

    if (clientType === ClientType.WEB) {
      this.cookieService.clearAuthCookies(res, deviceId);
    }

    return { message: 'Logged out successfully' };
  }

  // --- CURRENT USER ----------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return ApiResponseDto.success(user, 'Profile retrieved successfully');
  }

  // --- Helper -----------------------------------------------------
  private async callService<T>(pattern: string, data: any): Promise<T> {
    return await firstValueFrom(this.authClient.send<T>(pattern, data));
  }

  private async callAuthService<T extends AuthTokens>(
    pattern: string,
    data: any,
  ): Promise<T> {
    return await firstValueFrom(this.authClient.send<T>(pattern, data));
  }
}
