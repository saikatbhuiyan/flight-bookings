import { Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationService } from './authentication/authentication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage';
import { AuthAuditService } from './authentication/auth-audit.service';
import { RefreshTokenBlacklist } from './authentication/refresh-token-black-list.storage';
import {
  DatabaseModule,
} from '@app/database';
import { User } from './entities/user.entity';
import { AuthAudit } from './entities/auth-audit.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import {
  AccessTokenGuard,
  AuthenticationGuard,
  CookieService,
  CommonModule,
  RolesGuard,
  HealthModule,
  GlobalExceptionFilter,
  CommonRpcExceptionFilter,
  winstonLoggerConfig,
  LoggingInterceptor,
} from '@app/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { MessageBrokerModule } from '@app/message-broker';
import { AuthMessageController } from './authentication/authentication.controller';

import authConfig from '@app/common/config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot(
      [User, AuthAudit, NotificationSettings],
      ['apps/auth-service/src/migrations/*.ts'],
    ),
    TypeOrmModule.forFeature([User, AuthAudit, NotificationSettings]),
    MessageBrokerModule.forRoot(),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: CommonRpcExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    AccessTokenGuard,
    RefreshTokenIdsStorage,
    RefreshTokenBlacklist,
    AuthenticationService,
    JwtService,
    AuthAuditService,
    CookieService,
  ],
  controllers: [AuthMessageController],
})
export class AuthServiceModule { }
