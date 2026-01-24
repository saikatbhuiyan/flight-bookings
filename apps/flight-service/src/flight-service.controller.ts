import { Controller, Get, Query, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { FlightServiceService } from './flight-service.service';
import { SearchFlightDto, ApiResponseDto, MessagePattern as MP, RmqHelper } from '@app/common';

@ApiTags('Flights')
@Controller('flights')
export class FlightServiceController {
  private readonly logger = new Logger(FlightServiceController.name);

  constructor(private readonly flightServiceService: FlightServiceService) { }

  @Get()
  @MessagePattern(MP.FLIGHT_SEARCH)
  @ApiOperation({ summary: 'Search for flights' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of matching flights',
    type: ApiResponseDto,
  })
  async searchFlights(@Payload() searchDto: SearchFlightDto, @Ctx() context?: RmqContext) {
    if (context) {
      return RmqHelper.handleAck(context, async () => {
        this.logger.debug(`RMQ: Searching flights for ${searchDto.departureAirport} to ${searchDto.arrivalAirport}`);
        const flights = await this.flightServiceService.getHello();
        return [flights];
      });
    }
    this.logger.debug(`HTTP: Searching flights for ${searchDto.departureAirport} to ${searchDto.arrivalAirport}`);
    const flights = await this.flightServiceService.getHello();
    return ApiResponseDto.success([flights], 'Flights retrieved successfully');
  }

  @Get(':id')
  @MessagePattern(MP.FLIGHT_FIND_BY_ID)
  @ApiOperation({ summary: 'Get flight details by ID' })
  @ApiParam({ name: 'id', description: 'Flight ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the flight details',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getFlightById(@Payload('id') id: string, @Ctx() context?: RmqContext) {
    if (context && typeof context.getChannelRef === 'function') {
      return RmqHelper.handleAck(context, async () => {
        this.logger.debug(`RMQ: Getting flight ${id}`);
        return this.flightServiceService.getHello();
      });
    }
    this.logger.debug(`HTTP: Getting flight ${id}`);
    const flight = await this.flightServiceService.getHello();
    return ApiResponseDto.success(flight, 'Flight retrieved successfully');
  }
}
