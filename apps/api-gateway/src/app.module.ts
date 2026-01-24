import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthController } from './controllers/auth.controller';
import { FlightController } from './controllers/flight.controller';
import { BookingController } from './controllers/booking.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  CookieService,
  RedisModule,
  CommonModule,
  RabbitMQHealthIndicator,
  RedisHealthIndicator,
  GlobalExceptionFilter,
  winstonLoggerConfig,
  LoggingInterceptor,
} from '@app/common';
import { WinstonModule } from 'nest-winston';
import { TerminusModule } from '@nestjs/terminus';
import { GatewayHealthController } from './controllers/health.controller';
import authConfig from '@app/common/config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      envFilePath: '.env',
    }),
    RedisModule,
    CommonModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION') as any,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
          ttl: 3600000,
        }),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'auth_queue',
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': 'auth_queue_retry',
                'x-max-length': 10000,
              },
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'FLIGHT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'flight_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'BOOKING_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'booking_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    WinstonModule.forRoot(winstonLoggerConfig),
    TerminusModule,
  ],
  controllers: [
    AuthController,
    FlightController,
    BookingController,
    GatewayHealthController,
  ],
  providers: [
    CookieService,
    RabbitMQHealthIndicator,
    RedisHealthIndicator,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule { }
