import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { HealthModule } from '@app/common';
import { Flight } from './entities/flight.entity';
import { FlightServiceController } from './flight-service.controller';
import { FlightServiceService } from './flight-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([Flight]),
    TypeOrmModule.forFeature([Flight]),
    HealthModule,
  ],
  controllers: [FlightServiceController],
  providers: [FlightServiceService],
})
export class FlightServiceModule { }
