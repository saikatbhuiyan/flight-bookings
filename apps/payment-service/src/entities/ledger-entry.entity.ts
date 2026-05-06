import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum LedgerEntryType {
  PAYMENT = 'payment',
  REFUND = 'refund',
}

export enum LedgerDirection {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Entity('ledger_entries')
@Index(['paymentId'])
@Index(['refundId'])
@Index(['bookingId'])
@Index(['entryType'])
@Index(['occurredAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId?: string | null;

  @Column({ name: 'refund_id', type: 'uuid', nullable: true })
  refundId?: string | null;

  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @Column({ name: 'account_code', type: 'varchar', length: 100 })
  accountCode: string;

  @Column({ name: 'entry_type', type: 'enum', enum: LedgerEntryType })
  entryType: LedgerEntryType;

  @Column({ type: 'enum', enum: LedgerDirection })
  direction: LedgerDirection;

  @Column({ type: 'int', comment: 'Amount in the smallest currency unit' })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 100 })
  referenceType: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 255 })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
