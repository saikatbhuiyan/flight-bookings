import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Processed events tracking (for idempotency)
@Entity('processed_events')
export class ProcessedEvent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'event_id', unique: true })
    eventId: string;

    @Column({ name: 'event_type' })
    eventType: string;

    @Column({ name: 'aggregate_id' })
    aggregateId: string;

    @CreateDateColumn({ name: 'processed_at' })
    processedAt: Date;
}