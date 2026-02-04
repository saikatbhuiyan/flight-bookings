import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import {
  HealthModule,
  CommonModule,
  GlobalExceptionFilter,
  winstonLoggerConfig,
} from '@app/common';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Booking } from './entities/booking.entity';
import { LoggingInterceptor } from '@app/common';
import { BookingController } from './booking/booking.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([Booking], ['apps/booking-service/src/migrations/*.ts']),
    TypeOrmModule.forFeature([Booking]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
  ],
  controllers: [BookingController],
  providers: [
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
export class BookingServiceModule { }
