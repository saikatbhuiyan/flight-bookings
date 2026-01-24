import { Controller, Get, Post, Body, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { BookingServiceService } from './booking-service.service';
import { CreateBookingDto, ApiResponseDto, MessagePattern as MP, RmqHelper } from '@app/common';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingServiceController {
  private readonly logger = new Logger(BookingServiceController.name);

  constructor(private readonly bookingServiceService: BookingServiceService) { }

  @Post()
  @MessagePattern(MP.BOOKING_CREATE)
  @ApiOperation({ summary: 'Create a new flight booking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking created successfully',
    type: ApiResponseDto,
  })
  async createBooking(@Payload() createDto: CreateBookingDto, @Ctx() context?: RmqContext) {
    if (context) {
      return RmqHelper.handleAck(context, async () => {
        this.logger.debug(`RMQ: Creating booking for flight ${createDto.flightId}`);
        return this.bookingServiceService.getHello();
      });
    }
    this.logger.debug(`HTTP: Creating booking for flight ${createDto.flightId}`);
    const result = await this.bookingServiceService.getHello();
    return ApiResponseDto.success(result, 'Booking created successfully');
  }

  @Get(':id')
  @MessagePattern(MP.BOOKING_FIND_BY_ID)
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the booking details',
    type: ApiResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async getBookingById(@Payload('id') id: string, @Ctx() context?: RmqContext) {
    if (context && typeof context.getChannelRef === 'function') {
      return RmqHelper.handleAck(context, async () => {
        this.logger.debug(`RMQ: Getting booking ${id}`);
        return this.bookingServiceService.getHello();
      });
    }
    this.logger.debug(`HTTP: Getting booking ${id}`);
    const result = await this.bookingServiceService.getHello();
    return ApiResponseDto.success(result, 'Booking retrieved successfully');
  }
}
