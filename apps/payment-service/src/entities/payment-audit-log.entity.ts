import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum AuditAction {
    INTENT_CREATED = 'intent_created',
    PAYMENT_CAPTURED = 'payment_captured',
    PAYMENT_FAILED = 'payment_failed',
    REFUND_CREATED = 'refund_created',
    REFUND_PROCESSED = 'refund_processed',
    WEBHOOK_RECEIVED = 'webhook_received',
}

@Entity('payment_audit_log')
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class PaymentAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: false })
    entityType: string; // 'payment_intent', 'transaction', 'refund'

    @Column({ name: 'entity_id', type: 'uuid', nullable: false })
    entityId: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
        nullable: false,
    })
    action: AuditAction;

    @Column({ name: 'user_id', type: 'int', nullable: true })
    userId: number;

    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @Column({ type: 'jsonb', nullable: true })
    changes: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
