import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SeatLockService } from '@app/seat-lock';
import {
  BookingSagaOrchestrator,
  CreateBookingDto,
} from '../booking-saga/booking-saga.orchestrator';
import { BookingRepository } from '../repositories/booking.repository';

@Injectable()
export class BookingService {
  constructor(
    private readonly sagaOrchestrator: BookingSagaOrchestrator,
    private readonly bookingRepository: BookingRepository,
    private readonly seatLockService: SeatLockService,
  ) {}

  async createBooking(dto: CreateBookingDto, userId: number) {
    try {
      const booking = await this.sagaOrchestrator.executeBookingSaga({
        ...dto,
        userId,
      });

      return {
        bookingId: booking.bookingReference,
        status: booking.status,
        expiresAt: booking.expiresAt,
        totalCost: booking.totalCost,
        paymentRequired: true,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async completeBooking(
    bookingId: string,
    userId: number,
    paymentTransactionId: string,
  ) {
    try {
      const booking = await this.bookingRepository.findByReference(bookingId);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      const completedBooking = await this.sagaOrchestrator.completeBooking(
        bookingId,
        paymentTransactionId,
      );

      return {
        bookingId: completedBooking.bookingReference,
        status: completedBooking.status,
        paymentStatus: completedBooking.paymentStatus,
        seatNumbers: completedBooking.seatNumbers,
        flightNumber: completedBooking.flightNumber,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async cancelBooking(bookingId: string, userId: number, reason?: string) {
    try {
      const booking = await this.bookingRepository.findByReference(bookingId);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      const cancelledBooking = await this.sagaOrchestrator.cancelBooking(
        bookingId,
        reason || 'User requested cancellation',
      );

      return {
        bookingId: cancelledBooking.bookingReference,
        status: cancelledBooking.status,
        refundAmount: cancelledBooking.refundAmount,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async extendBooking(bookingId: string, userId: number) {
    try {
      const booking = await this.bookingRepository.findByReference(bookingId);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      const extended = await this.seatLockService.extendLock(
        booking.flightId,
        bookingId,
        300,
      ); // 5 more minutes

      if (!extended) {
        throw new BadRequestException(
          'Cannot extend booking - locks may have expired',
        );
      }

      // Update booking expiry in DB
      booking.expiresAt = new Date(Date.now() + 300 * 1000);
      await this.bookingRepository.update(booking.id, {
        expiresAt: booking.expiresAt,
      });

      return {
        bookingId,
        expiresAt: booking.expiresAt,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getMyBookings(userId: number, status?: string) {
    const bookings = await this.bookingRepository.findByUserId(userId);
    return bookings.filter((b) => !status || b.status === status);
  }

  async getBooking(bookingId: string, userId: number) {
    const booking = await this.bookingRepository.findByReference(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    return booking;
  }

  async checkSeatAvailability(flightId: number, seats: string) {
    const seatArray = seats.split(',');
    const lockedSeats = await this.seatLockService.areSeatsLocked(
      flightId,
      seatArray,
    );

    const availability = Array.from(lockedSeats.entries()).map(
      ([seat, locked]) => ({
        seat,
        available: !locked,
      }),
    );

    return {
      flightId,
      seats: availability,
      allAvailable: availability.every((s) => s.available),
    };
  }
}
