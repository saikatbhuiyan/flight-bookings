import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum IdempotencyKeyStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('idempotency_keys')
@Index(['scope', 'idempotencyKey'], { unique: true })
@Index(['status'])
@Index(['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 100 })
  scope: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 128 })
  requestHash: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 100, nullable: true })
  resourceType?: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'enum', enum: IdempotencyKeyStatus, default: IdempotencyKeyStatus.PROCESSING })
  status: IdempotencyKeyStatus;

  @Column({ name: 'response_code', type: 'int', nullable: true })
  responseCode?: number | null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody?: Record<string, any> | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
