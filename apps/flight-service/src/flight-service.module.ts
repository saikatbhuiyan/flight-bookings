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
import { Flight } from './entities/flight.entity';
import { FlightServiceController } from './flight-service.controller';
import { FlightServiceService } from './flight-service.service';
import { LoggingInterceptor } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([Flight]),
    TypeOrmModule.forFeature([Flight]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
  ],
  controllers: [FlightServiceController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    FlightServiceService,
  ],
})
export class FlightServiceModule { }
