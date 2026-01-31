import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  VersionColumn,
} from 'typeorm';

export enum BookingStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('bookings')
@Index(['userId'])
@Index(['flightId'])
@Index(['status'])
@Index(['bookingReference'], { unique: true })
@Index(['createdAt'])
@Index(['userId', 'status'])
export class Booking {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    name: 'booking_reference',
    type: 'varchar',
    length: 10,
    nullable: false,
    unique: true
  })
  bookingReference: string;

  @Column({ name: 'flight_id', type: 'int', nullable: false })
  flightId: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @Column({ name: 'no_of_seats', type: 'int', nullable: false, default: 1 })
  noOfSeats: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalCost: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.INITIATED,
    nullable: false,
  })
  status: BookingStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    nullable: false,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'passenger_name', type: 'varchar', length: 200, nullable: true })
  passengerName: string;

  @Column({ name: 'passenger_email', type: 'varchar', length: 255, nullable: true })
  passengerEmail: string;

  @Column({ name: 'passenger_phone', type: 'varchar', length: 20, nullable: true })
  passengerPhone: string;

  // Denormalized flight data (snapshot at booking time)
  @Column({ name: 'flight_number', type: 'varchar', length: 20, nullable: true })
  flightNumber: string;

  @Column({ name: 'departure_airport_code', type: 'varchar', length: 3, nullable: true })
  departureAirportCode: string;

  @Column({ name: 'arrival_airport_code', type: 'varchar', length: 3, nullable: true })
  arrivalAirportCode: string;

  @Column({ name: 'departure_time', type: 'timestamp with time zone', nullable: true })
  departureTime: Date;

  @Column({ name: 'arrival_time', type: 'timestamp with time zone', nullable: true })
  arrivalTime: Date;

  // Seat information
  @Column({ name: 'seat_numbers', type: 'varchar', length: 100, nullable: true })
  seatNumbers: string; // JSON array or comma-separated: "12A,12B"

  @Column({ name: 'seat_class', type: 'varchar', length: 50, nullable: true })
  seatClass: string; // ECONOMY, BUSINESS, FIRST_CLASS

  // Payment details
  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_transaction_id', type: 'varchar', length: 100, nullable: true })
  paymentTransactionId: string;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date;

  // Cancellation tracking
  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ name: 'refunded_at', type: 'timestamp with time zone', nullable: true })
  refundedAt: Date;

  // Expiry for pending bookings (15 minutes hold)
  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  // Optimistic locking to prevent race conditions
  @VersionColumn()
  version: number;

  // Metadata
  @Column({ name: 'booking_source', type: 'varchar', length: 50, nullable: true })
  bookingSource: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional flexible data

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Generate booking reference before insert
  @BeforeInsert()
  generateBookingReference() {
    if (!this.bookingReference) {
      this.bookingReference = this.generateRandomReference();
    }

    // Set expiry time (15 minutes from creation)
    if (!this.expiresAt && this.status === BookingStatus.INITIATED) {
      this.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  private generateRandomReference(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
    let reference = 'BK';
    for (let i = 0; i < 8; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return reference;
  }
}