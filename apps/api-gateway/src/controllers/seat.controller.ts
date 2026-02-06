import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  Inject,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  MessagePattern as MP,
  Public,
  Roles,
  Role,
  CreateSeatDto,
  BulkCreateSeatsDto,
} from '@app/common';

@ApiTags('Seats')
@Controller('seats')
export class SeatController {
  constructor(
    @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new seat' })
  async create(@Body() createSeatDto: CreateSeatDto) {
    return this.callService(MP.SEAT_CREATE, createSeatDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create seats for an airplane' })
  async bulkCreate(@Body() bulkDto: BulkCreateSeatsDto) {
    return this.callService(MP.SEAT_BULK_CREATE, bulkDto);
  }

  @Get('airplane/:airplaneId')
  @Public()
  @ApiOperation({ summary: 'Get all seats for an airplane' })
  async findByAirplane(@Param('airplaneId', ParseIntPipe) airplaneId: number) {
    return this.callService(MP.AIRPLANE_GET_SEATS, { airplaneId });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a seat' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.callService(MP.SEAT_DELETE, { id });
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
