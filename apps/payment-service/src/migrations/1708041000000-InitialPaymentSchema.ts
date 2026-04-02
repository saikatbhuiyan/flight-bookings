import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPaymentSchema1708041000000 implements MigrationInterface {
    name = 'InitialPaymentSchema1708041000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create payment_intents table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_intents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "gateway" varchar(50) NOT NULL,
        "gateway_payment_id" varchar(255) NOT NULL UNIQUE,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "client_secret" text,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

        // Create indexes for payment_intents
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_intents_booking_id" ON "payment_intents" ("booking_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_intents_user_id" ON "payment_intents" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_intents_status" ON "payment_intents" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_intents_gateway_payment_id" ON "payment_intents" ("gateway_payment_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_intents_created_at" ON "payment_intents" ("created_at")`);

        // Create payment_transactions table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_intent_id" uuid NOT NULL,
        "transaction_type" varchar(50) NOT NULL,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL,
        "gateway" varchar(50) NOT NULL,
        "gateway_transaction_id" varchar(255) NOT NULL UNIQUE,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "error_message" text,
        "raw_response" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_payment_transactions_payment_intent" FOREIGN KEY ("payment_intent_id") 
          REFERENCES "payment_intents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create indexes for payment_transactions
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_payment_intent_id" ON "payment_transactions" ("payment_intent_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_gateway_transaction_id" ON "payment_transactions" ("gateway_transaction_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_status" ON "payment_transactions" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_created_at" ON "payment_transactions" ("created_at")`);

        // Create refunds table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refunds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_transaction_id" uuid NOT NULL,
        "booking_id" integer NOT NULL,
        "amount" integer NOT NULL,
        "reason" text,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "gateway_refund_id" varchar(255),
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_refunds_payment_transaction" FOREIGN KEY ("payment_transaction_id") 
          REFERENCES "payment_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

        // Create indexes for refunds
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_payment_transaction_id" ON "refunds" ("payment_transaction_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_booking_id" ON "refunds" ("booking_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_status" ON "refunds" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refunds_created_at" ON "refunds" ("created_at")`);

        // Create payment_audit_log table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "user_id" integer,
        "ip_address" inet,
        "user_agent" text,
        "changes" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

        // Create indexes for payment_audit_log
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_audit_log_entity" ON "payment_audit_log" ("entity_type", "entity_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_audit_log_user_id" ON "payment_audit_log" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_audit_log_action" ON "payment_audit_log" ("action")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payment_audit_log_created_at" ON "payment_audit_log" ("created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (respecting foreign keys)
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_audit_log"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "refunds"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_intents"`);
    }
}
