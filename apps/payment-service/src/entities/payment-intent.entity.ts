import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum PaymentIntentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    CANCELED = 'canceled',
}

@Entity('payment_intents')
@Index(['bookingId'])
@Index(['userId'])
@Index(['status'])
@Index(['gatewayPaymentId'], { unique: true })
@Index(['createdAt'])
export class PaymentIntent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'booking_id', type: 'int', nullable: false })
    @Index()
    bookingId: number;

    @Column({ name: 'user_id', type: 'int', nullable: false })
    userId: number;

    @Column({ type: 'int', nullable: false, comment: 'Amount in cents' })
    amount: number;

    @Column({ type: 'varchar', length: 3, nullable: false, default: 'USD' })
    currency: string;

    @Column({ type: 'varchar', length: 50, nullable: false })
    gateway: string; // 'stripe', 'paypal'

    @Column({
        name: 'gateway_payment_id',
        type: 'varchar',
        length: 255,
        nullable: false,
        unique: true,
    })
    gatewayPaymentId: string;

    @Column({
        type: 'enum',
        enum: PaymentIntentStatus,
        default: PaymentIntentStatus.PENDING,
        nullable: false,
    })
    status: PaymentIntentStatus;

    @Column({ name: 'client_secret', type: 'text', nullable: true })
    clientSecret: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
