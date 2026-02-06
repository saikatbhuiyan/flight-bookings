import {
  Controller,
  Get,
  Query,
  Param,
  HttpStatus,
  Inject,
  HttpException,
  Post,
  Body,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  MessagePattern as MP,
  ApiResponseDto,
  Public,
  Roles,
  Role,
  SharedCreateFlightDto,
  SharedSearchFlightDto,
} from '@app/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Flights')
@Controller('flights')
export class FlightController {
  constructor(
    @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search for flights' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of matching flights',
    type: ApiResponseDto,
  })
  async searchFlights(@Query() searchDto: SharedSearchFlightDto) {
    const result = await this.callService(MP.FLIGHT_SEARCH, searchDto);
    return ApiResponseDto.success(result, 'Flights retrieved successfully');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get flight details by ID' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the flight details',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flight not found',
  })
  async getFlightById(@Param('id', ParseIntPipe) id: number) {
    const result = await this.callService(MP.FLIGHT_FIND_BY_ID, { id });
    return ApiResponseDto.success(result, 'Flight retrieved successfully');
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new flight' })
  async create(@Body() createDto: SharedCreateFlightDto) {
    const result = await this.callService(MP.FLIGHT_CREATE, createDto);
    return ApiResponseDto.success(result, 'Flight created successfully');
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a flight' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.callService(MP.FLIGHT_DELETE, { id });
    return ApiResponseDto.success(null, 'Flight deleted successfully');
  }

  private async callService<T>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(this.flightClient.send<T>(pattern, data));
    } catch (error) {
      const rpcError = error;
      console.error(`[Gateway] Error calling ${pattern}:`, rpcError);

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (typeof rpcError.status === 'number') {
        status = rpcError.status;
      } else if (
        rpcError.statusCode &&
        typeof rpcError.statusCode === 'number'
      ) {
        status = rpcError.statusCode;
      }

      let message = 'Internal server error';
      if (typeof rpcError.message === 'string') {
        message = rpcError.message;
      } else if (rpcError.message && typeof rpcError.message === 'object') {
        message =
          rpcError.message.message ||
          rpcError.message.error ||
          JSON.stringify(rpcError.message);
      }

      throw new HttpException(message, status);
    }
  }
}
