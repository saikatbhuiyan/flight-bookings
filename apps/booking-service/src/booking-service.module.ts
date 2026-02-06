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
import { BookingService } from './booking/booking.service';
import { BookingSagaOrchestrator } from './booking-saga/booking-saga.orchestrator';
import { BookingRepository } from './repositories/booking.repository';
import { SeatLockService } from '@app/seat-lock';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([Booking], [__dirname + '/migrations/*.{ts,js}']),
    TypeOrmModule.forFeature([Booking]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
    EventEmitterModule,
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
    BookingService,
    BookingSagaOrchestrator,
    BookingRepository,
    SeatLockService,
    EventEmitter2,
  ],
})
export class BookingServiceModule {}
