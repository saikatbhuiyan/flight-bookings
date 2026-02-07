import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum OutboxEventStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
}

@Entity('outbox_events')
@Index(['status', 'createdAt'])
@Index(['aggregateId'])
@Index(['eventType'])
export class OutboxEvent {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'event_id', type: 'varchar', length: 36, unique: true })
    eventId: string;

    @Column({ name: 'aggregate_type', type: 'varchar', length: 50 })
    aggregateType: string;

    @Column({ name: 'aggregate_id', type: 'varchar', length: 36 })
    aggregateId: string;

    @Column({ name: 'event_type', type: 'varchar', length: 100 })
    eventType: string;

    @Column({ type: 'jsonb', nullable: false })
    payload: Record<string, any>;

    @Column({
        type: 'enum',
        enum: OutboxEventStatus,
        default: OutboxEventStatus.PENDING,
    })
    status: OutboxEventStatus;

    @Column({ name: 'retry_count', type: 'int', default: 0 })
    retryCount: number;

    @Column({ name: 'max_retries', type: 'int', default: 3 })
    maxRetries: number;

    @Column({ name: 'last_error', type: 'text', nullable: true })
    lastError: string;

    @Column({ name: 'published_at', type: 'timestamp', nullable: true })
    publishedAt: Date;

    @Column({ name: 'trace_id', type: 'varchar', length: 32, nullable: true })
    traceId: string;

    @Column({ name: 'span_id', type: 'varchar', length: 16, nullable: true })
    spanId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}