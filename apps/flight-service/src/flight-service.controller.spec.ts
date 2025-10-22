import { Test, TestingModule } from '@nestjs/testing';
import { FlightServiceController } from './flight-service.controller';
import { FlightServiceService } from './flight-service.service';

describe('FlightServiceController', () => {
  let flightServiceController: FlightServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FlightServiceController],
      providers: [FlightServiceService],
    }).compile();

    flightServiceController = app.get<FlightServiceController>(FlightServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(flightServiceController.getHello()).toBe('Hello World!');
    });
  });
});
