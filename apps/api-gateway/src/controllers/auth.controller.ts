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
  BadRequestException,
  HttpException,
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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  SignUpDto as RegisterDto,
  SignInDto,
  RefreshTokenDto,
  SignOutDto,
} from '@app/common';
import { RateLimit } from '../rate-limiter/decorators/rate-limit.decorator';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@ApiTags('Authentication')
@RateLimit({ points: 5, duration: 60 })
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly cookieService: CookieService,
  ) { }

  // --- REGISTER ---------------------------------------------------
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async register(@Body() registerDto: RegisterDto) {
    console.log('Register DTO:', registerDto);
    const result = await this.callService(MP.AUTH_REGISTER, registerDto);
    return ApiResponseDto.success(result, 'User registered successfully');
  }

  // --- LOGIN ------------------------------------------------------
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: SignInDto,
  ) {
    const { clientType = ClientType.WEB, deviceId } = loginDto;

    const result = await this.callAuthService(MP.AUTH_LOGIN, {
      ...loginDto,
      ip: req.ip,
    });

    console.log('Login result:', result);

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, result.accessToken, deviceId);
      this.cookieService.setRefreshToken(res, result.refreshToken, deviceId);
      return ApiResponseDto.success(null, 'Login successful');
    }

    return ApiResponseDto.success(result, 'Login successful');
  }

  // --- REFRESH TOKEN ---------------------------------------------
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Missing or invalid refresh token' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    const { clientType = ClientType.WEB, deviceId } = refreshTokenDto;

    const refreshToken =
      clientType === ClientType.WEB
        ? req.cookies[`refreshToken_${deviceId}`]
        : refreshTokenDto.refreshToken;

    if (!refreshToken) throw new BadRequestException('Missing refresh token');

    const result = await this.callAuthService(MP.AUTH_REFRESH, {
      ...refreshTokenDto,
      refreshToken,
    });

    if (clientType === ClientType.WEB) {
      this.cookieService.setAccessToken(res, result.accessToken, deviceId);
      this.cookieService.setRefreshToken(res, result.refreshToken, deviceId);
      return ApiResponseDto.success(null, 'Token refreshed successfully');
    }

    return ApiResponseDto.success(result, 'Token refreshed successfully');
  }

  // --- SIGN OUT ---------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Body() payload: SignOutDto,
  ) {
    const { clientType = ClientType.WEB, deviceId } = payload;
    await this.callService(MP.AUTH_SIGNOUT, payload);

    if (clientType === ClientType.WEB) {
      this.cookieService.clearAuthCookies(res, deviceId);
    }

    return ApiResponseDto.success(null, 'Logged out successfully');
  }

  // --- CURRENT USER ----------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: any) {
    return ApiResponseDto.success(user, 'Profile retrieved successfully');
  }

  // --- Helper -----------------------------------------------------
  private async callService<T>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(this.authClient.send<T>(pattern, data));
    } catch (error) {
      const rpcError = error as any;
      console.error(`[Gateway] Error calling ${pattern}:`, rpcError);

      // Extract status: handle numeric and standard RMQ status formats
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (typeof rpcError.status === 'number') {
        status = rpcError.status;
      } else if (rpcError.statusCode && typeof rpcError.statusCode === 'number') {
        status = rpcError.statusCode;
      }

      // Extract message: handle string, array, or nested object formats
      let message = 'Internal server error';
      if (typeof rpcError.message === 'string') {
        message = rpcError.message;
      } else if (rpcError.message && typeof rpcError.message === 'object') {
        // Handle NestJS standard error response object: { message: "...", error: "...", statusCode: ... }
        message = rpcError.message.message || rpcError.message.error || JSON.stringify(rpcError.message);
      } else if (rpcError.error && typeof rpcError.error === 'string') {
        message = rpcError.error;
      }

      throw new HttpException(message, status);
    }
  }

  private async callAuthService<T extends AuthTokens>(
    pattern: string,
    data: any,
  ): Promise<T> {
    return this.callService<T>(pattern, data);
  }
}
