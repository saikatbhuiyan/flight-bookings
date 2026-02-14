import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum SagaStatus {
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

@Entity('saga_states')
@Index(['sagaId'], { unique: true })
@Index(['bookingId'])
@Index(['status'])
@Index(['createdAt'])
export class SagaState {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'saga_id', type: 'varchar', length: 36, unique: true })
    sagaId: string;

    @Column({ name: 'saga_type', type: 'varchar', length: 50 })
    sagaType: string;

    @Column({ name: 'booking_id', type: 'varchar', length: 36 })
    bookingId: string;

    @Column({
        type: 'enum',
        enum: SagaStatus,
        default: SagaStatus.INITIATED,
    })
    status: SagaStatus;

    @Column({ name: 'current_step', type: 'int', default: 0 })
    currentStep: number;

    @Column({ name: 'total_steps', type: 'int', default: 6 })
    totalSteps: number;

    @Column({ type: 'jsonb', nullable: false })
    payload: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    context: Record<string, any>;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'retry_count', type: 'int', default: 0 })
    retryCount: number;

    @Column({ name: 'max_retries', type: 'int', default: 3 })
    maxRetries: number;

    @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
    lastErrorAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ name: 'compensated_at', type: 'timestamp', nullable: true })
    compensatedAt: Date;

    @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
    idempotencyKey: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}