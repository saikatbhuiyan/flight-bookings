
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus, PaymentStatus } from '../entities/booking.entity';
import { SagaState, SagaStatus } from '../entities/saga-state.entity';
import { SeatLockService } from '@app/seat-lock';
import { OutboxService } from '../outbox/outbox.service';
import { v4 as uuidv4 } from 'uuid';
import { trace, context as otelContext, SpanStatusCode } from '@opentelemetry/api';

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

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly tracer = trace.getTracer('booking-service');

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(SagaState)
    private readonly sagaStateRepository: Repository<SagaState>,
    private readonly seatLockService: SeatLockService,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Execute booking saga with persistence and idempotency
   */
  async executeBookingSaga(dto: CreateBookingDto, idempotencyKey?: string): Promise<Booking> {
    const span = this.tracer.startSpan('saga.executeBooking', {
      attributes: {
        'booking.flight_id': dto.flightId,
        'booking.user_id': dto.userId,
      },
    });

    try {
      // Check idempotency
      if (idempotencyKey) {
        const existingSaga = await this.sagaStateRepository.findOne({
          where: { idempotencyKey },
        });

        if (existingSaga) {
          this.logger.log(`Saga already exists for idempotency key: ${idempotencyKey}`);
          const booking = await this.bookingRepository.findOne({
            where: { bookingReference: existingSaga.bookingId },
          });
          span.end();
          return booking;
        }
      }

      const sagaId = uuidv4();
      const bookingId = uuidv4();

      // Create saga state
      const sagaState = await this.sagaStateRepository.save({
        sagaId,
        bookingId,
        status: SagaStatus.INITIATED,
        currentStep: 0,
        payload: dto,
        context: {},
        idempotencyKey,
      });

      // Execute steps
      await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
        await this.executeStep1_CreateBooking(sagaState);
        await this.executeStep2_LockSeats(sagaState);
        await this.executeStep3_ReserveFlightSeats(sagaState);
      });

      const booking = await this.bookingRepository.findOne({
        where: { bookingReference: bookingId },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return booking;
    } catch (error) {
      this.logger.error('Saga execution failed:', error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Step 1: Create Booking (Idempotent with transaction)
   */
  private async executeStep1_CreateBooking(sagaState: SagaState): Promise<void> {
    const span = this.tracer.startSpan('saga.step1.createBooking');

    try {
      if (sagaState.currentStep >= 1) {
        this.logger.log('Step 1 already completed (idempotent)');
        span.end();
        return;
      }

      await this.dataSource.transaction(async (manager) => {
        const dto = sagaState.payload as CreateBookingDto;

        const booking = manager.create(Booking, {
          bookingReference: sagaState.bookingId,
          userId: dto.userId,
          flightId: dto.flightId,
          noOfSeats: dto.seatNumbers.length,
          seatNumbers: dto.seatNumbers,
          seatClass: dto.seatClass,
          totalCost: dto.totalCost,
          passengerName: dto.passengerName,
          passengerEmail: dto.passengerEmail,
          passengerPhone: dto.passengerPhone,
          status: BookingStatus.INITIATED,
          paymentStatus: PaymentStatus.PENDING,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        await manager.save(Booking, booking);

        // Update saga state
        sagaState.currentStep = 1;
        sagaState.status = SagaStatus.INITIATED;
        await manager.save(SagaState, sagaState);

        // Store event in outbox (same transaction)
        await this.outboxService.storeEvent(
          'BOOKING',
          sagaState.bookingId,
          'booking.created',
          { bookingId: sagaState.bookingId, userId: dto.userId },
          manager,
        );
      });

      this.logger.log(`Step 1 completed: Booking ${sagaState.bookingId} created`);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Step 2: Lock Seats (Idempotent)
   */
  private async executeStep2_LockSeats(sagaState: SagaState): Promise<void> {
    const span = this.tracer.startSpan('saga.step2.lockSeats');

    try {
      if (sagaState.currentStep >= 2) {
        this.logger.log('Step 2 already completed (idempotent)');
        span.end();
        return;
      }

      const dto = sagaState.payload as CreateBookingDto;

      const lockResult = await this.seatLockService.lockSeats(
        dto.flightId,
        dto.seatNumbers,
        sagaState.bookingId,
        dto.userId,
      );

      if (!lockResult.success) {
        throw new Error(`Failed to lock seats: ${lockResult.failedSeats.join(', ')}`);
      }

      // Update saga state
      await this.dataSource.transaction(async (manager) => {
        sagaState.currentStep = 2;
        sagaState.status = SagaStatus.SEATS_LOCKED;
        sagaState.context = { ...sagaState.context, lockKey: lockResult.lockKey };
        await manager.save(SagaState, sagaState);
      });

      this.logger.log('Step 2 completed: Seats locked');
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      await this.compensate(sagaState, error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Step 3: Reserve Flight Seats (Idempotent via Outbox)
   */
  private async executeStep3_ReserveFlightSeats(sagaState: SagaState): Promise<void> {
    const span = this.tracer.startSpan('saga.step3.reserveFlightSeats');

    try {
      if (sagaState.currentStep >= 3) {
        this.logger.log('Step 3 already completed (idempotent)');
        span.end();
        return;
      }

      await this.dataSource.transaction(async (manager) => {
        const dto = sagaState.payload as CreateBookingDto;

        // Store event in outbox
        await this.outboxService.storeEvent(
          'BOOKING',
          sagaState.bookingId,
          'flight.reserve-seats',
          {
            flightId: dto.flightId,
            bookingId: sagaState.bookingId,
            seatClass: dto.seatClass,
            seatCount: dto.seatNumbers.length,
          },
          manager,
        );

        // Update saga state
        sagaState.currentStep = 3;
        sagaState.status = SagaStatus.FLIGHT_RESERVED;
        await manager.save(SagaState, sagaState);

        // Update booking status
        await manager.update(
          Booking,
          { bookingReference: sagaState.bookingId },
          { status: BookingStatus.PENDING },
        );
      });

      this.logger.log('Step 3 completed: Flight reservation requested');
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      await this.compensate(sagaState, error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Complete booking after payment
   */
  async completeBooking(bookingId: string, paymentTransactionId: string): Promise<Booking> {
    const span = this.tracer.startSpan('saga.completeBooking');

    try {
      const sagaState = await this.sagaStateRepository.findOne({
        where: { bookingId },
      });

      if (!sagaState) {
        throw new Error('Saga state not found');
      }

      // Idempotency check
      if (sagaState.status === SagaStatus.BOOKING_CONFIRMED) {
        this.logger.log(`Booking ${bookingId} already confirmed (idempotent)`);
        return await this.bookingRepository.findOne({
          where: { bookingReference: bookingId },
        });
      }

      await this.dataSource.transaction(async (manager) => {
        const dto = sagaState.payload as CreateBookingDto;

        // Store confirm event in outbox
        await this.outboxService.storeEvent(
          'BOOKING',
          bookingId,
          'flight.confirm-seats',
          {
            flightId: dto.flightId,
            bookingId,
            seatClass: dto.seatClass,
            seatCount: dto.seatNumbers.length,
          },
          manager,
        );

        // Update booking
        await manager.update(
          Booking,
          { bookingReference: bookingId },
          {
            status: BookingStatus.BOOKED,
            paymentStatus: PaymentStatus.COMPLETED,
            paymentTransactionId,
            paidAt: new Date(),
            expiresAt: null,
          },
        );

        // Update saga state
        sagaState.currentStep = 6;
        sagaState.status = SagaStatus.BOOKING_CONFIRMED;
        await manager.save(SagaState, sagaState);

        // Store notification event
        await this.outboxService.storeEvent(
          'BOOKING',
          bookingId,
          'booking.confirmed',
          { bookingId, userId: dto.userId },
          manager,
        );
      });

      // Release Redis locks (outside transaction)
      await this.seatLockService.releaseSeats(dto.flightId, bookingId);

      span.setStatus({ code: SpanStatusCode.OK });
      return await this.bookingRepository.findOne({
        where: { bookingReference: bookingId },
      });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Compensation (Idempotent)
   */
  private async compensate(sagaState: SagaState, error: Error): Promise<void> {
    const span = this.tracer.startSpan('saga.compensate');

    try {
      this.logger.warn(`Starting compensation for saga ${sagaState.sagaId}`);

      if (sagaState.status === SagaStatus.COMPENSATED) {
        this.logger.log('Saga already compensated (idempotent)');
        return;
      }

      await this.dataSource.transaction(async (manager) => {
        sagaState.status = SagaStatus.COMPENSATING;
        sagaState.errorMessage = error.message;
        await manager.save(SagaState, sagaState);

        // Compensate based on current step
        if (sagaState.currentStep >= 3) {
          const dto = sagaState.payload as CreateBookingDto;

          // Release flight seats via outbox
          await this.outboxService.storeEvent(
            'BOOKING',
            sagaState.bookingId,
            'flight.release-seats',
            {
              flightId: dto.flightId,
              bookingId: sagaState.bookingId,
              seatClass: dto.seatClass,
              seatCount: dto.seatNumbers.length,
            },
            manager,
          );
        }

        if (sagaState.currentStep >= 2) {
          // Release Redis locks (outside transaction)
          const dto = sagaState.payload as CreateBookingDto;
          await this.seatLockService.releaseSeats(dto.flightId, sagaState.bookingId);
        }

        // Update booking to cancelled
        await manager.update(
          Booking,
          { bookingReference: sagaState.bookingId },
          {
            status: BookingStatus.CANCELLED,
            cancellationReason: `Saga failed: ${error.message}`,
            cancelledAt: new Date(),
          },
        );

        // Mark saga as compensated
        sagaState.status = SagaStatus.COMPENSATED;
        await manager.save(SagaState, sagaState);
      });

      span.setStatus({ code: SpanStatusCode.OK });
      this.logger.log(`Compensation completed for saga ${sagaState.sagaId}`);
    } catch (compensationError) {
      this.logger.error('Compensation failed:', compensationError);
      span.setStatus({ code: SpanStatusCode.ERROR, message: compensationError.message });
    } finally {
      span.end();
    }
  }
}