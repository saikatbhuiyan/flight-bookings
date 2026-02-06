import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MessagePattern as MP } from '@app/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from '../booking-saga/booking-saga.orchestrator';
import { RateLimit } from '@app/rate-limiter';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @RateLimit({ points: 3, duration: 60, blockDuration: 300 })
  @ApiOperation({ summary: 'Create a new booking' })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    const data = await this.bookingService.createBooking(dto, req.user.id);
    return {
      success: true,
      message:
        'Booking initiated successfully. Please complete payment within 15 minutes.',
      data,
    };
  }

  /**
   * Step 2: Complete booking (after payment)
   */
  @Post(':bookingId/complete')
  @RateLimit({ points: 5, duration: 60 })
  @ApiOperation({ summary: 'Complete booking after payment' })
  async completeBooking(
    @Param('bookingId') bookingId: string,
    @Body() paymentDto: { paymentTransactionId: string },
    @Req() req: any,
  ) {
    const data = await this.bookingService.completeBooking(
      bookingId,
      req.user.id,
      paymentDto.paymentTransactionId,
    );
    return {
      success: true,
      message: 'Booking confirmed successfully!',
      data,
    };
  }

  /**
   * Cancel booking (trigger compensation)
   */
  @Put(':bookingId/cancel')
  @RateLimit({ points: 5, duration: 60 })
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() cancelDto: { reason?: string },
    @Req() req: any,
  ) {
    const data = await this.bookingService.cancelBooking(
      bookingId,
      req.user.id,
      cancelDto.reason,
    );
    return {
      success: true,
      message: 'Booking cancelled successfully',
      data,
    };
  }

  /**
   * Extend booking expiry (if user needs more time)
   */
  @Put(':bookingId/extend')
  @RateLimit({ points: 2, duration: 60 })
  @ApiOperation({ summary: 'Extend booking expiry time' })
  async extendBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
    const data = await this.bookingService.extendBooking(
      bookingId,
      req.user.id,
    );
    return {
      success: true,
      message: 'Booking extended by 5 minutes',
      data,
    };
  }

  /**
   * Get user's bookings
   */
  @Get('my-bookings')
  @ApiOperation({ summary: 'Get current user bookings' })
  async getMyBookings(@Req() req: any, @Query('status') status?: string) {
    const data = await this.bookingService.getMyBookings(req.user.id, status);
    return {
      success: true,
      data,
    };
  }

  /**
   * Get booking details
   */
  @Get(':bookingId')
  @ApiOperation({ summary: 'Get booking by ID' })
  async getBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
    const data = await this.bookingService.getBooking(bookingId, req.user.id);
    return {
      success: true,
      data,
    };
  }

  /**
   * Check seat availability (before booking)
   */
  @Get('flights/:flightId/seats/availability')
  @ApiOperation({ summary: 'Check if seats are available' })
  async checkSeatAvailability(
    @Param('flightId') flightId: number,
    @Query('seats') seats: string,
  ) {
    const data = await this.bookingService.checkSeatAvailability(
      flightId,
      seats,
    );
    return {
      success: true,
      data,
    };
  }

  // ============================================
  // MESSAGE HANDLERS (for API Gateway via RMQ)
  // ============================================

  @MessagePattern(MP.BOOKING_CREATE)
  async handleCreateBooking(
    @Payload() data: CreateBookingDto & { userId: number },
  ) {
    return this.bookingService.createBooking(data, data.userId);
  }

  @MessagePattern(MP.BOOKING_COMPLETE)
  async handleCompleteBooking(
    @Payload()
    data: {
      bookingId: string;
      userId: number;
      paymentTransactionId: string;
    },
  ) {
    return this.bookingService.completeBooking(
      data.bookingId,
      data.userId,
      data.paymentTransactionId,
    );
  }

  @MessagePattern(MP.BOOKING_CANCEL)
  async handleCancelBooking(
    @Payload() data: { bookingId: string; userId: number; reason?: string },
  ) {
    return this.bookingService.cancelBooking(
      data.bookingId,
      data.userId,
      data.reason,
    );
  }

  @MessagePattern(MP.BOOKING_EXTEND)
  async handleExtendBooking(
    @Payload() data: { bookingId: string; userId: number },
  ) {
    return this.bookingService.extendBooking(data.bookingId, data.userId);
  }

  @MessagePattern(MP.BOOKING_FIND_BY_USER)
  async handleGetMyBookings(
    @Payload() data: { userId: number; status?: string },
  ) {
    return this.bookingService.getMyBookings(data.userId, data.status);
  }

  @MessagePattern(MP.BOOKING_FIND_BY_ID)
  async handleGetBooking(
    @Payload() data: { bookingId: string; userId: number },
  ) {
    return this.bookingService.getBooking(data.bookingId, data.userId);
  }

  @MessagePattern(MP.BOOKING_CHECK_AVAILABILITY)
  async handleCheckAvailability(
    @Payload() data: { flightId: number; seats: string },
  ) {
    return this.bookingService.checkSeatAvailability(data.flightId, data.seats);
  }
}
