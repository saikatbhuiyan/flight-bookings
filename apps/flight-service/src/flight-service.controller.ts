import { Controller, Get } from '@nestjs/common';
import { FlightServiceService } from './flight-service.service';

@Controller()
export class FlightServiceController {
  constructor(private readonly flightServiceService: FlightServiceService) {}

  @Get()
  getHello(): string {
    return this.flightServiceService.getHello();
  }
}
