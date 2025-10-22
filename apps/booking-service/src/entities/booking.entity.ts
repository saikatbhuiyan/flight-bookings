import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@app/common/entities/base.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('bookings')
@Index(['userId'])
@Index(['flightId'])
@Index(['bookingReference'], { unique: true })
export class Booking extends BaseEntity {
  @Column({ name: 'booking_reference', unique: true })
  bookingReference: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'flight_id' })
  flightId: string;

  @Column({ type: 'int', name: 'number_of_passengers' })
  numberOfPassengers: number;

  @Column({ type: 'jsonb' })
  passengers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
  }>;

  @Column({ name: 'flight_class' })
  flightClass: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'payment_id', nullable: true })
  paymentId?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'seat_numbers' })
  seatNumbers?: string[];

  @Column({ type: 'text', nullable: true, name: 'special_requests' })
  specialRequests?: string;

  @Column({
    name: 'booked_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  bookedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: string;
}
