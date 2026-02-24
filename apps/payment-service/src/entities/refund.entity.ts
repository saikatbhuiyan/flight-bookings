import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { PaymentTransaction } from './payment-transaction.entity';

export enum RefundStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    CANCELED = 'canceled',
}

@Entity('refunds')
@Index(['paymentTransactionId'])
@Index(['bookingId'])
@Index(['status'])
@Index(['createdAt'])
export class Refund {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'payment_transaction_id', type: 'uuid', nullable: false })
    @Index()
    paymentTransactionId: string;

    @ManyToOne(() => PaymentTransaction)
    @JoinColumn({ name: 'payment_transaction_id' })
    paymentTransaction: PaymentTransaction;

    @Column({ name: 'booking_id', type: 'int', nullable: false })
    @Index()
    bookingId: number;

    @Column({ type: 'int', nullable: false, comment: 'Refund amount in cents' })
    amount: number;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @Column({
        type: 'enum',
        enum: RefundStatus,
        default: RefundStatus.PENDING,
        nullable: false,
    })
    status: RefundStatus;

    @Column({
        name: 'gateway_refund_id',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    gatewayRefundId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
