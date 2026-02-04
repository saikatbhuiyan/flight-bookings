import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeatLockService } from '@app/seat-lock';
import { BookingSagaOrchestrator, CreateBookingDto } from '../booking-saga/booking-saga.orchestrator';
import { BookingRepository } from '../repositories/booking.repository';
import { RateLimit } from '@app/rate-limiter';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingController {
    constructor(
        private readonly sagaOrchestrator: BookingSagaOrchestrator,
        private readonly bookingRepository: BookingRepository,
        private readonly seatLockService: SeatLockService,
    ) { }

    /**
     * Step 1: Initiate booking (lock seats, create pending booking)
     */
    @Post()
    @RateLimit({ points: 3, duration: 60, blockDuration: 300 })
    @ApiOperation({ summary: 'Create a new booking' })
    async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
        try {
            const booking = await this.sagaOrchestrator.executeBookingSaga({
                ...dto,
                userId: req.user.id,
            });

            return {
                success: true,
                message: 'Booking initiated successfully. Please complete payment within 15 minutes.',
                data: {
                    bookingId: booking.bookingReference,
                    status: booking.status,
                    expiresAt: booking.expiresAt,
                    totalCost: booking.totalCost,
                    paymentRequired: true,
                },
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
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
        try {
            // Verify booking belongs to user
            const booking = await this.bookingRepository.findByReference(bookingId);
            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.userId !== req.user.id) {
                throw new BadRequestException('Unauthorized');
            }

            const completedBooking = await this.sagaOrchestrator.completeBooking(
                bookingId,
                paymentDto.paymentTransactionId,
            );

            return {
                success: true,
                message: 'Booking confirmed successfully!',
                data: {
                    bookingId: completedBooking.bookingReference,
                    status: completedBooking.status,
                    paymentStatus: completedBooking.paymentStatus,
                    seatNumbers: completedBooking.seatNumbers,
                    flightNumber: completedBooking.flightNumber,
                },
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
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
        try {
            const booking = await this.bookingRepository.findByReference(bookingId);
            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.userId !== req.user.id) {
                throw new BadRequestException('Unauthorized');
            }

            const cancelledBooking = await this.sagaOrchestrator.cancelBooking(
                bookingId,
                cancelDto.reason || 'User requested cancellation',
            );

            return {
                success: true,
                message: 'Booking cancelled successfully',
                data: {
                    bookingId: cancelledBooking.bookingReference,
                    status: cancelledBooking.status,
                    refundAmount: cancelledBooking.refundAmount,
                },
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Extend booking expiry (if user needs more time)
     */
    @Put(':bookingId/extend')
    @RateLimit({ points: 2, duration: 60 })
    @ApiOperation({ summary: 'Extend booking expiry time' })
    async extendBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
        try {
            const booking = await this.bookingRepository.findByReference(bookingId);
            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.userId !== req.user.id) {
                throw new BadRequestException('Unauthorized');
            }

            const extended = await this.seatLockService.extendLock(booking.flightId, bookingId, 300); // 5 more minutes

            if (!extended) {
                throw new BadRequestException('Cannot extend booking - locks may have expired');
            }

            // Update booking expiry in DB
            booking.expiresAt = new Date(Date.now() + 300 * 1000);
            await this.bookingRepository.update(booking.id, { expiresAt: booking.expiresAt });

            return {
                success: true,
                message: 'Booking extended by 5 minutes',
                data: {
                    bookingId,
                    expiresAt: booking.expiresAt,
                },
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get user's bookings
     */
    @Get('my-bookings')
    @ApiOperation({ summary: 'Get current user bookings' })
    async getMyBookings(@Req() req: any, @Query('status') status?: string) {
        const bookings = await this.bookingRepository.findByUserId(req.user.id);

        return {
            success: true,
            data: bookings.filter((b) => !status || b.status === status),
        };
    }

    /**
     * Get booking details
     */
    @Get(':bookingId')
    @ApiOperation({ summary: 'Get booking by ID' })
    async getBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
        const booking = await this.bookingRepository.findByReference(bookingId);

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId !== req.user.id) {
            throw new BadRequestException('Unauthorized');
        }

        return {
            success: true,
            data: booking,
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
        const seatArray = seats.split(',');
        const lockedSeats = await this.seatLockService.areSeatsLocked(flightId, seatArray);

        const availability = Array.from(lockedSeats.entries()).map(([seat, locked]) => ({
            seat,
            available: !locked,
        }));

        return {
            success: true,
            data: {
                flightId,
                seats: availability,
                allAvailable: availability.every((s) => s.available),
            },
        };
    }
}