import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { PaymentIntent } from './payment-intent.entity';

export enum TransactionType {
    CHARGE = 'charge',
    REFUND = 'refund',
    CHARGEBACK = 'chargeback',
}

export enum TransactionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
}

@Entity('payment_transactions')
@Index(['paymentIntentId'])
@Index(['gatewayTransactionId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class PaymentTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'payment_intent_id', type: 'uuid', nullable: false })
    @Index()
    paymentIntentId: string;

    @ManyToOne(() => PaymentIntent)
    @JoinColumn({ name: 'payment_intent_id' })
    paymentIntent: PaymentIntent;

    @Column({
        name: 'transaction_type',
        type: 'enum',
        enum: TransactionType,
        nullable: false,
    })
    transactionType: TransactionType;

    @Column({ type: 'int', nullable: false, comment: 'Amount in cents' })
    amount: number;

    @Column({ type: 'varchar', length: 3, nullable: false })
    currency: string;

    @Column({ type: 'varchar', length: 50, nullable: false })
    gateway: string;

    @Column({
        name: 'gateway_transaction_id',
        type: 'varchar',
        length: 255,
        nullable: false,
        unique: true,
    })
    gatewayTransactionId: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
        nullable: false,
    })
    status: TransactionStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
    rawResponse: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
