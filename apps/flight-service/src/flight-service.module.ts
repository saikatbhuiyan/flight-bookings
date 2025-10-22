import { Module } from '@nestjs/common';
import { FlightServiceController } from './flight-service.controller';
import { FlightServiceService } from './flight-service.service';

@Module({
  imports: [],
  controllers: [FlightServiceController],
  providers: [FlightServiceService],
})
export class FlightServiceModule {}
