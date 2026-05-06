import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradePaymentDomain1772000000000 implements MigrationInterface {
  name = 'UpgradePaymentDomain1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "payment_method" varchar(50) NOT NULL,
        "gateway" varchar(50) NOT NULL,
        "gateway_payment_id" varchar(255) NOT NULL UNIQUE,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "client_secret" text,
        "correlation_id" varchar(100),
        "failure_code" varchar(100),
        "failure_reason" text,
        "confirmed_at" timestamp,
        "refunded_at" timestamp,
        "expires_at" timestamp,
        "metadata" jsonb,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_booking_id" ON "payments" ("booking_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_user_id" ON "payments" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_gateway_payment_id" ON "payments" ("gateway_payment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_created_at" ON "payments" ("created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idempotency_key" varchar(255) NOT NULL,
        "scope" varchar(100) NOT NULL,
        "request_hash" varchar(128) NOT NULL,
        "resource_type" varchar(100),
        "resource_id" uuid,
        "status" varchar(50) NOT NULL DEFAULT 'processing',
        "response_code" integer,
        "response_body" jsonb,
        "last_error" text,
        "locked_at" timestamp,
        "expires_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_idempotency_scope_key" UNIQUE ("scope", "idempotency_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_idempotency_keys_status" ON "idempotency_keys" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_idempotency_keys_expires_at" ON "idempotency_keys" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "refunds"
      ADD COLUMN IF NOT EXISTS "payment_id" uuid,
      ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(255),
      ADD COLUMN IF NOT EXISTS "failure_reason" text,
      ADD COLUMN IF NOT EXISTS "processed_at" timestamp,
      ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);

    await queryRunner.query(`
      UPDATE "refunds" r
      SET "payment_id" = pt."payment_intent_id"
      FROM "payment_transactions" pt
      WHERE r."payment_transaction_id" = pt."id" AND r."payment_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refunds_payment_id" ON "refunds" ("payment_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_refunds_gateway_refund_id" ON "refunds" ("gateway_refund_id")
      WHERE "gateway_refund_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_id" uuid,
        "refund_id" uuid,
        "booking_id" integer NOT NULL,
        "account_code" varchar(100) NOT NULL,
        "entry_type" varchar(50) NOT NULL,
        "direction" varchar(50) NOT NULL,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL,
        "reference_type" varchar(100) NOT NULL,
        "reference_id" varchar(255) NOT NULL,
        "description" text,
        "occurred_at" timestamp NOT NULL,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_payment_id" ON "ledger_entries" ("payment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_refund_id" ON "ledger_entries" ("refund_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_booking_id" ON "ledger_entries" ("booking_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_entry_type" ON "ledger_entries" ("entry_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_occurred_at" ON "ledger_entries" ("occurred_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "gateway" varchar(50) NOT NULL,
        "event_id" varchar(255) NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'received',
        "payment_id" uuid,
        "gateway_payment_id" varchar(255),
        "payload_hash" varchar(128),
        "payload" jsonb NOT NULL,
        "last_error" text,
        "received_at" timestamp NOT NULL DEFAULT now(),
        "processed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_webhook_gateway_event" UNIQUE ("gateway", "event_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_webhook_events_status" ON "webhook_events" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_webhook_events_received_at" ON "webhook_events" ("received_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refunds_payment_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refunds_gateway_refund_id"`);
    await queryRunner.query(`
      ALTER TABLE "refunds"
      DROP COLUMN IF EXISTS "payment_id",
      DROP COLUMN IF EXISTS "idempotency_key",
      DROP COLUMN IF EXISTS "failure_reason",
      DROP COLUMN IF EXISTS "processed_at",
      DROP COLUMN IF EXISTS "updated_at",
      DROP COLUMN IF EXISTS "metadata"
    `);
  }
}
