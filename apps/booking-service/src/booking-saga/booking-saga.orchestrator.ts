import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
} from '../entities/booking.entity';
import { SeatLockService } from '@app/seat-lock';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

export enum SagaStep {
  INITIATED = 'INITIATED',
  SEATS_LOCKED = 'SEATS_LOCKED',
  FLIGHT_RESERVED = 'FLIGHT_RESERVED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

export interface CreateBookingDto {
  userId: number;
  flightId: number;
  seatNumbers: string[];
  seatClass: string;
  totalCost: number;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
}

export interface SagaState {
  bookingId: string;
  currentStep: SagaStep;
  data: CreateBookingDto;
  lockKey?: string;
  flightReservationId?: string;
  paymentTransactionId?: string;
  error?: string;
}

@Injectable()
export class BookingSagaOrchestrator {
  private readonly logger = new Logger(BookingSagaOrchestrator.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly seatLockService: SeatLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute booking saga with compensation on failure
   */
  async executeBookingSaga(dto: CreateBookingDto): Promise<Booking> {
    const bookingId = uuidv4();
    const sagaState: SagaState = {
      bookingId,
      currentStep: SagaStep.INITIATED,
      data: dto,
    };

    this.logger.log(`Starting booking saga for booking ${bookingId}`);

    try {
      // Step 1: Create initial booking record
      await this.createInitialBooking(sagaState);

      // Step 2: Lock seats in Redis
      await this.lockSeatsStep(sagaState);

      // Step 3: Reserve seats in Flight Service (via RabbitMQ)
      await this.reserveFlightSeatsStep(sagaState);

      // Booking is now in PENDING state, waiting for payment
      return await this.bookingRepository.findOne({
        where: { bookingReference: bookingId },
      });
    } catch (error) {
      this.logger.error(`Saga failed at step ${sagaState.currentStep}:`, error);
      await this.compensate(sagaState, error);
      throw error;
    }
  }

  /**
   * Complete booking after successful payment
   */
  async completeBooking(
    bookingId: string,
    paymentTransactionId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingReference: bookingId, status: BookingStatus.PENDING },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const sagaState: SagaState = {
      bookingId,
      currentStep: SagaStep.PAYMENT_PROCESSING,
      data: null,
      paymentTransactionId,
    };

    try {
      // Step 4: Confirm seats in Flight Service
      await this.confirmFlightSeatsStep(sagaState, booking);

      // Step 5: Update booking to BOOKED
      await this.confirmBookingStep(sagaState, booking, paymentTransactionId);

      // Step 6: Release Redis locks (seats are now in DB)
      await this.seatLockService.releaseSeats(booking.flightId, bookingId);

      // Emit event for notifications
      this.eventEmitter.emit('booking.confirmed', {
        bookingId,
        userId: booking.userId,
        flightId: booking.flightId,
        passengerEmail: booking.passengerEmail,
      });

      this.logger.log(`Booking saga completed successfully for ${bookingId}`);
      return booking;
    } catch (error) {
      this.logger.error('Error completing booking:', error);
      await this.compensate(sagaState, error);
      throw error;
    }
  }

  /**
   * Cancel booking and trigger compensation
   */
  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { bookingReference: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // const sagaState: SagaState = {
    //   bookingId,
    //   currentStep: SagaStep.BOOKING_CONFIRMED,
    //   data: null,
    // };

    try {
      // Release seats in Flight Service
      await this.releaseFlightSeatsStep(booking);

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason;
      await this.bookingRepository.save(booking);

      // Release Redis locks if any
      await this.seatLockService.releaseSeats(booking.flightId, bookingId);

      // Emit cancellation event
      this.eventEmitter.emit('booking.cancelled', {
        bookingId,
        userId: booking.userId,
        flightId: booking.flightId,
      });

      this.logger.log(`Booking ${bookingId} cancelled successfully`);
      return booking;
    } catch (error) {
      this.logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // ============================================
  // SAGA STEPS
  // ============================================

  private async createInitialBooking(state: SagaState): Promise<void> {
    const booking = this.bookingRepository.create({
      bookingReference: state.bookingId,
      userId: state.data.userId,
      flightId: state.data.flightId,
      noOfSeats: state.data.seatNumbers.length,
      seatNumbers: state.data.seatNumbers,
      seatClass: state.data.seatClass,
      totalCost: state.data.totalCost,
      passengerName: state.data.passengerName,
      passengerEmail: state.data.passengerEmail,
      passengerPhone: state.data.passengerPhone,
      status: BookingStatus.INITIATED,
      paymentStatus: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await this.bookingRepository.save(booking);
    state.currentStep = SagaStep.INITIATED;
    this.logger.log(`Step 1: Created booking ${state.bookingId}`);
  }

  private async lockSeatsStep(state: SagaState): Promise<void> {
    const lockResult = await this.seatLockService.lockSeats(
      state.data.flightId,
      state.data.seatNumbers,
      state.bookingId,
      state.data.userId,
    );

    if (!lockResult.success) {
      throw new Error(
        `Failed to lock seats: ${lockResult.failedSeats.join(', ')}. These seats are already reserved.`,
      );
    }

    state.lockKey = lockResult.lockKey;
    state.currentStep = SagaStep.SEATS_LOCKED;
    this.logger.log(
      `Step 2: Locked ${state.data.seatNumbers.length} seats in Redis`,
    );
  }

  private async reserveFlightSeatsStep(state: SagaState): Promise<void> {
    // Emit event to Flight Service via RabbitMQ
    this.eventEmitter.emit('flight.reserve-seats', {
      flightId: state.data.flightId,
      bookingId: state.bookingId,
      seatClass: state.data.seatClass,
      seatCount: state.data.seatNumbers.length,
    });

    // Update booking status to PENDING (waiting for payment)
    await this.bookingRepository.update(
      { bookingReference: state.bookingId },
      { status: BookingStatus.PENDING },
    );

    state.currentStep = SagaStep.FLIGHT_RESERVED;
    this.logger.log(`Step 3: Reserved seats in Flight Service`);
  }

  private confirmFlightSeatsStep(state: SagaState, booking: Booking): void {
    // Emit event to Flight Service to confirm reservation
    this.eventEmitter.emit('flight.confirm-seats', {
      flightId: booking.flightId,
      bookingId: state.bookingId,
      seatClass: booking.seatClass,
      seatCount: booking.noOfSeats,
    });

    state.currentStep = SagaStep.PAYMENT_COMPLETED;
    this.logger.log(`Step 4: Confirmed seats in Flight Service`);
  }

  private async confirmBookingStep(
    state: SagaState,
    booking: Booking,
    paymentTransactionId: string,
  ): Promise<void> {
    booking.status = BookingStatus.BOOKED;
    booking.paymentStatus = PaymentStatus.COMPLETED;
    booking.paymentTransactionId = paymentTransactionId;
    booking.paidAt = new Date();
    booking.expiresAt = null; // No longer expires

    await this.bookingRepository.save(booking);
    state.currentStep = SagaStep.BOOKING_CONFIRMED;
    this.logger.log(`Step 5: Booking confirmed`);
  }

  // ============================================
  // COMPENSATION (ROLLBACK)
  // ============================================

  private async compensate(state: SagaState, error: Error): Promise<void> {
    this.logger.warn(`Starting compensation for booking ${state.bookingId}`);
    const lastStep = state.currentStep;
    state.currentStep = SagaStep.COMPENSATING;
    state.error = error.message;

    try {
      // Compensate based on how far we got
      switch (lastStep) {
        case SagaStep.BOOKING_CONFIRMED:
        case SagaStep.PAYMENT_COMPLETED:
        case SagaStep.PAYMENT_PROCESSING:
        case SagaStep.FLIGHT_RESERVED:
          // Release flight seats
          const booking = await this.bookingRepository.findOne({
            where: { bookingReference: state.bookingId },
          });
          if (booking) {
            await this.releaseFlightSeatsStep(booking);
          }
        // Fall through
        case SagaStep.SEATS_LOCKED:
          // Release Redis locks
          await this.seatLockService.releaseSeats(
            booking.flightId,
            state.bookingId,
          );
        // Fall through
        case SagaStep.INITIATED:
          // Update booking to FAILED
          await this.bookingRepository.update(
            { bookingReference: state.bookingId },
            {
              status: BookingStatus.CANCELLED,
              cancellationReason: `Saga failed: ${error.message}`,
              cancelledAt: new Date(),
            },
          );
          break;
      }

      state.currentStep = SagaStep.COMPENSATED;
      this.logger.log(`Compensation completed for booking ${state.bookingId}`);
    } catch (compensationError) {
      this.logger.error('Compensation failed:', compensationError);
      // This is critical - manual intervention required
      this.eventEmitter.emit('booking.compensation-failed', {
        bookingId: state.bookingId,
        originalError: error.message,
        compensationError: compensationError.message,
      });
    }
  }

  private releaseFlightSeatsStep(booking: Booking): void {
    this.eventEmitter.emit('flight.release-seats', {
      flightId: booking.flightId,
      bookingId: booking.bookingReference,
      seatClass: booking.seatClass,
      seatCount: booking.noOfSeats,
    });

    this.logger.log(
      `Released ${booking.noOfSeats} seats in Flight Service for booking ${booking.bookingReference}`,
    );
  }
}
