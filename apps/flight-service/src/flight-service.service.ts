import { Injectable } from '@nestjs/common';

@Injectable()
export class FlightServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
