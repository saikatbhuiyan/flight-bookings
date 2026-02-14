import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableIndex,
} from 'typeorm';

export class AddSagaAndOutbox1770486663295 implements MigrationInterface {
    name = 'AddSagaAndOutbox1770486663295';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create saga_states_status_enum
        await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saga_states_status_enum') THEN
          CREATE TYPE "public"."saga_states_status_enum" AS ENUM(
            'INITIATED', 
            'SEATS_LOCKED', 
            'FLIGHT_RESERVED', 
            'PAYMENT_PROCESSING', 
            'PAYMENT_COMPLETED', 
            'BOOKING_CONFIRMED', 
            'FAILED', 
            'COMPENSATING', 
            'COMPENSATED'
          );
        END IF;
      END $$;
    `);

        // Create saga_states table
        await queryRunner.createTable(
            new Table({
                name: 'saga_states',
                columns: [
                    {
                        name: 'id',
                        type: 'serial',
                        isPrimary: true,
                    },
                    {
                        name: 'saga_id',
                        type: 'varchar',
                        length: '36',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'saga_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'booking_id',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: [
                            'INITIATED',
                            'SEATS_LOCKED',
                            'FLIGHT_RESERVED',
                            'PAYMENT_PROCESSING',
                            'PAYMENT_COMPLETED',
                            'BOOKING_CONFIRMED',
                            'FAILED',
                            'COMPENSATING',
                            'COMPENSATED',
                        ],
                        enumName: 'saga_states_status_enum',
                        default: "'INITIATED'",
                        isNullable: false,
                    },
                    {
                        name: 'current_step',
                        type: 'integer',
                        default: '0',
                        isNullable: false,
                    },
                    {
                        name: 'total_steps',
                        type: 'integer',
                        default: '6',
                        isNullable: false,
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'context',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'retry_count',
                        type: 'integer',
                        default: '0',
                        isNullable: false,
                    },
                    {
                        name: 'max_retries',
                        type: 'integer',
                        default: '3',
                        isNullable: false,
                    },
                    {
                        name: 'last_error_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'completed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'compensated_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'idempotency_key',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create saga_states indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_3ba29ee0383d442fa0e4f6dbba" ON "saga_states" ("created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c707d2bbf2290a58023d4f9b16" ON "saga_states" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b55caaedced424e15f452ea7bd" ON "saga_states" ("booking_id")`);

        // Create outbox_events_status_enum
        await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_events_status_enum') THEN
          CREATE TYPE "public"."outbox_events_status_enum" AS ENUM(
            'PENDING', 
            'PROCESSING', 
            'PUBLISHED', 
            'FAILED'
          );
        END IF;
      END $$;
    `);

        // Create outbox_events table
        await queryRunner.createTable(
            new Table({
                name: 'outbox_events',
                columns: [
                    {
                        name: 'id',
                        type: 'serial',
                        isPrimary: true,
                    },
                    {
                        name: 'event_id',
                        type: 'varchar',
                        length: '36',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'aggregate_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'aggregate_id',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'],
                        enumName: 'outbox_events_status_enum',
                        default: "'PENDING'",
                        isNullable: false,
                    },
                    {
                        name: 'retry_count',
                        type: 'integer',
                        default: '0',
                        isNullable: false,
                    },
                    {
                        name: 'max_retries',
                        type: 'integer',
                        default: '3',
                        isNullable: false,
                    },
                    {
                        name: 'last_error',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'published_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'trace_id',
                        type: 'varchar',
                        length: '32',
                        isNullable: true,
                    },
                    {
                        name: 'span_id',
                        type: 'varchar',
                        length: '16',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create outbox_events indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_287c7ad6ab8e2fc1f2e25b59e4" ON "outbox_events" ("event_type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_85ca65d119cee338ec8d714bfa" ON "outbox_events" ("aggregate_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cc0d2a98103923a41a9aebc384" ON "outbox_events" ("status", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('outbox_events');
        await queryRunner.query('DROP TYPE "public"."outbox_events_status_enum"');
        await queryRunner.dropTable('saga_states');
        await queryRunner.query('DROP TYPE "public"."saga_states_status_enum"');
    }
}
