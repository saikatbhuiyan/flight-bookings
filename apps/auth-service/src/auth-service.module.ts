import { Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationService } from './authentication/authentication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage';
import { AuthAuditService } from './authentication/auth-audit.service';
import { RefreshTokenBlacklist } from './authentication/refresh-token-black-list.storage';
import {
  AuthAudit,
  DatabaseModule,
  NotificationSettings,
  User,
} from '@app/database';
import {
  AccessTokenGuard,
  AuthenticationGuard,
  CookieService,
  RedisModule,
  RolesGuard,
} from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageBrokerModule } from '@app/message-broker';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AuthMessageController } from './authentication/authentication.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([User, AuthAudit, NotificationSettings]),
    TypeOrmModule.forFeature([User, AuthAudit, NotificationSettings]),
    // JwtModule.registerAsync(appConfig['jwt'].asProvider()),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
          ttl: 3600000, // 1 hour
        }),
      }),
      inject: [ConfigService],
    }),
    MessageBrokerModule.forRoot(),
    RedisModule,
  ],
  providers: [
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
export class AuthServiceModule {}
