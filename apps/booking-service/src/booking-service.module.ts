import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { HealthModule, CommonModule, GlobalExceptionFilter, winstonLoggerConfig } from '@app/common';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { rabbitmqConfig } from './config/rabbitmq.config';
import { Booking } from './entities/booking.entity';
import { SagaState } from './entities/saga-state.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { LoggingInterceptor } from '@app/common';
import { BookingController } from './booking/booking.controller';
import { BookingPaymentHandler } from './booking/booking-payment.handler';
import { BookingService } from './booking/booking.service';
import { BookingSagaOrchestrator } from './booking-saga/saga-orchestrator.service';
import { OutboxService } from './outbox/outbox.service';
import { BookingRepository } from './repositories/booking.repository';
import { SeatLockService } from '@app/seat-lock';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { paymentProviders } from './payment/payment.providers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/booking-service/.env', '.env'],
    }),
    DatabaseModule.forRoot([Booking, SagaState, OutboxEvent], [__dirname + '/migrations/*.{ts,js}']),
    TypeOrmModule.forFeature([Booking, SagaState, OutboxEvent]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
    EventEmitterModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
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
    BookingPaymentHandler,
    BookingService,
    BookingSagaOrchestrator,
    OutboxService,
    BookingRepository,
    SeatLockService,
    EventEmitter2,
    ...paymentProviders,
  ],
})
export class BookingServiceModule {}
