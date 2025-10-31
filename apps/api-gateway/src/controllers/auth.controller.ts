import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { MessagePattern as MP, ApiResponseDto, Public } from '@app/common';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() registerDto: any) {
    const result = await firstValueFrom(
      this.authClient.send(MP.AUTH_REGISTER, registerDto),
    );
    return ApiResponseDto.success(result, 'User registered successfully');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  async login(@Body() loginDto: any) {
    const result = await firstValueFrom(
      this.authClient.send(MP.AUTH_LOGIN, loginDto),
    );
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(@Body() refreshTokenDto: any) {
    const result = await firstValueFrom(
      this.authClient.send(MP.AUTH_REFRESH, refreshTokenDto),
    );
    return ApiResponseDto.success(result, 'Token refreshed successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return ApiResponseDto.success(user, 'Profile retrieved successfully');
  }
}
