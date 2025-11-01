import { Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { AuthenticationService } from './authentication/authentication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage';
import { AuthAuditService } from './authentication/auth-audit.service';
import { RefreshTokenBlacklist } from './authentication/refresh-token-black-list.storage';
import { AuthAudit, User } from '@app/database';
import {
  AccessTokenGuard,
  AuthenticationGuard,
  CookieService,
  RolesGuard,
} from '@app/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthAudit]),
    // JwtModule.registerAsync(appConfig['jwt'].asProvider()),
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
  controllers: [AuthenticationController],
})
export class AuthServiceModule {}
