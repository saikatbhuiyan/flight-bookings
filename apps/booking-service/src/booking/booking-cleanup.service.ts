import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingSagaOrchestrator } from '../booking-saga/booking-saga.orchestrator';
import { BookingRepository } from '../repositories/booking.repository';
import { SeatLockService } from '@app/seat-lock';

@Injectable()
export class BookingCleanupService {
    private readonly logger = new Logger(BookingCleanupService.name);

    constructor(
        private readonly bookingRepository: BookingRepository,
        private readonly seatLockService: SeatLockService,
        private readonly sagaOrchestrator: BookingSagaOrchestrator,
    ) { }

    /**
     * Clean up expired bookings every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async cleanupExpiredBookings(): Promise<void> {
        try {
            const expiredBookings = await this.bookingRepository.findExpiredBookings();

            if (expiredBookings.length === 0) {
                return;
            }

            this.logger.log(`Found ${expiredBookings.length} expired bookings to clean up`);

            for (const booking of expiredBookings) {
                try {
                    // Cancel expired booking (triggers compensation)
                    await this.sagaOrchestrator.cancelBooking(
                        booking.bookingReference,
                        'Booking expired - payment not completed within time limit',
                    );

                    this.logger.log(`Cancelled expired booking ${booking.bookingReference}`);
                } catch (error) {
                    this.logger.error(
                        `Error cancelling expired booking ${booking.bookingReference}:`,
                        error,
                    );
                }
            }
        } catch (error) {
            this.logger.error('Error in cleanup task:', error);
        }
    }

    /**
     * Clean up orphaned Redis locks every 5 minutes
     */
    // @Cron(CronExpression.EVERY_5_MINUTES)
    // async cleanupExpiredLocks(): Promise<void> {
    //     try {
    //         const deletedCount = await this.seatLockService.cleanupExpiredLocks();
    //         if (deletedCount > 0) {
    //             this.logger.log(`Cleaned up ${deletedCount} expired Redis locks`);
    //         }
    //     } catch (error) {
    //         this.logger.error('Error cleaning up locks:', error);
    //     }
    // }
}