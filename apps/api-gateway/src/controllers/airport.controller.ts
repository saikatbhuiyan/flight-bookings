import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Inject,
  HttpException,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  MessagePattern as MP,
  Public,
  Roles,
  Role,
  CreateAirportDto,
  UpdateAirportDto,
  QueryAirportDto,
} from '@app/common';

/**
 * API Gateway controller for Airport operations
 * Proxies requests to flight-service via RabbitMQ
 */
@ApiTags('Airports')
@Controller('airports')
export class AirportController {
  constructor(
    @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new airport' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Airport created successfully',
  })
  async create(@Body() createAirportDto: CreateAirportDto) {
    return this.callService(MP.AIRPORT_CREATE, createAirportDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all airports with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Airports retrieved successfully',
  })
  async findAll(@Query() queryDto: QueryAirportDto) {
    return this.callService(MP.AIRPORT_FIND_ALL, queryDto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search airports by code' })
  async searchByCode(@Query('code') code: string) {
    return this.callService(MP.AIRPORT_SEARCH, { code });
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get airport statistics' })
  async getStatistics() {
    return this.callService(MP.AIRPORT_FIND_ALL, { limit: 0 });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get airport by ID' })
  @ApiParam({ name: 'id', description: 'Airport ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.callService(MP.AIRPORT_FIND_BY_ID, { id });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update airport' })
  @ApiParam({ name: 'id', description: 'Airport ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAirportDto: UpdateAirportDto,
  ) {
    return this.callService(MP.AIRPORT_UPDATE, { id, updateAirportDto });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete airport' })
  @ApiParam({ name: 'id', description: 'Airport ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.callService(MP.AIRPORT_DELETE, { id });
  }

  private async callService<T>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(this.flightClient.send<T>(pattern, data));
    } catch (error) {
      const rpcError = error;
      const status =
        rpcError.statusCode ||
        rpcError.status ||
        HttpStatus.INTERNAL_SERVER_ERROR;
      const message = rpcError.message || 'Internal server error';
      throw new HttpException(message, status);
    }
  }
}
