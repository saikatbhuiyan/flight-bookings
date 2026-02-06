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
import { City } from './entities/city.entity';
import { Airport } from './entities/airport.entity';
import { Airplane } from './entities/airplane.entity';
import { Seat } from './entities/seat.entity';
import { LoggingInterceptor } from '@app/common';
import { CityModule } from './modules/city/city.module';
import { AirportModule } from './modules/airport/airport.module';
import { AirplaneModule } from './modules/airplane/airplane.module';
import { SeatModule } from './modules/seat/seat.module';
import { FlightModule } from './modules/flight/flight.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot(
      [Flight, City, Airport, Airplane, Seat],
      [__dirname + '/migrations/*.{ts,js}'],
    ),
    TypeOrmModule.forFeature([Flight, City, Airport, Airplane, Seat]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
    CityModule,
    AirportModule,
    AirplaneModule,
    SeatModule,
    FlightModule,
  ],
  controllers: [],
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
export class FlightServiceModule { }
