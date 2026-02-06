import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    HttpStatus,
    Inject,
    HttpException,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    MessagePattern as MP,
    ApiResponseDto,
    CreateBookingDto,
    CurrentUser,
} from '@app/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BookingController {
    constructor(
        @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new flight booking' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Booking created successfully',
        type: ApiResponseDto,
    })
    async createBooking(@Body() createDto: CreateBookingDto, @CurrentUser() user: any) {
        const result = await this.callService(MP.BOOKING_CREATE, {
            ...createDto,
            userId: user.id,
        });
        return ApiResponseDto.success(result, 'Booking initiated successfully');
    }

    @Post(':bookingId/complete')
    @ApiOperation({ summary: 'Complete booking after payment' })
    async completeBooking(
        @Param('bookingId') bookingId: string,
        @Body() paymentDto: { paymentTransactionId: string },
        @CurrentUser() user: any,
    ) {
        const result = await this.callService(MP.BOOKING_COMPLETE, {
            bookingId,
            userId: user.id,
            paymentTransactionId: paymentDto.paymentTransactionId,
        });
        return ApiResponseDto.success(result, 'Booking confirmed successfully');
    }

    @Put(':bookingId/cancel')
    @ApiOperation({ summary: 'Cancel a booking' })
    async cancelBooking(
        @Param('bookingId') bookingId: string,
        @Body() cancelDto: { reason?: string },
        @CurrentUser() user: any,
    ) {
        const result = await this.callService(MP.BOOKING_CANCEL, {
            bookingId,
            userId: user.id,
            reason: cancelDto.reason,
        });
        return ApiResponseDto.success(result, 'Booking cancelled successfully');
    }

    @Put(':bookingId/extend')
    @ApiOperation({ summary: 'Extend booking expiry' })
    async extendBooking(@Param('bookingId') bookingId: string, @CurrentUser() user: any) {
        const result = await this.callService(MP.BOOKING_EXTEND, {
            bookingId,
            userId: user.id,
        });
        return ApiResponseDto.success(result, 'Booking extended successfully');
    }

    @Get('my-bookings')
    @ApiOperation({ summary: 'Get my bookings' })
    async getMyBookings(@CurrentUser() user: any) {
        const result = await this.callService(MP.BOOKING_FIND_BY_USER, {
            userId: user.id,
        });
        return ApiResponseDto.success(result, 'Bookings retrieved successfully');
    }

    @Get(':bookingId')
    @ApiOperation({ summary: 'Get booking details' })
    @ApiParam({ name: 'bookingId', description: 'Booking ID' })
    async getBooking(@Param('bookingId') bookingId: string, @CurrentUser() user: any) {
        const result = await this.callService(MP.BOOKING_FIND_BY_ID, {
            bookingId,
            userId: user.id,
        });
        return ApiResponseDto.success(result, 'Booking retrieved successfully');
    }

    @Get('flights/:flightId/seats/availability')
    @ApiOperation({ summary: 'Check seat availability' })
    async checkSeatAvailability(
        @Param('flightId') flightId: number,
        @Query('seats') seats: string,
    ) {
        const result = await this.callService(MP.BOOKING_CHECK_AVAILABILITY, {
            flightId,
            seats,
        });
        return ApiResponseDto.success(result, 'Availability checked successfully');
    }

    private async callService<T>(pattern: string, data: any): Promise<T> {
        try {
            return await firstValueFrom(this.bookingClient.send<T>(pattern, data));
        } catch (error) {
            const rpcError = error as any;
            console.error(`[Gateway] Error calling ${pattern}:`, rpcError);

            let status = HttpStatus.INTERNAL_SERVER_ERROR;
            if (typeof rpcError.status === 'number') {
                status = rpcError.status;
            } else if (rpcError.statusCode && typeof rpcError.statusCode === 'number') {
                status = rpcError.statusCode;
            }

            let message = 'Internal server error';
            if (typeof rpcError.message === 'string') {
                message = rpcError.message;
            } else if (rpcError.message && typeof rpcError.message === 'object') {
                message = rpcError.message.message || rpcError.message.error || JSON.stringify(rpcError.message);
            }

            throw new HttpException(message, status);
        }
    }
}
