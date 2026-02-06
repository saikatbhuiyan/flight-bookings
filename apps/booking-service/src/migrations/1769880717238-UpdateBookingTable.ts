import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBookingTable1769880717238 implements MigrationInterface {
  name = 'UpdateBookingTable1769880717238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_flight_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_expired"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "seat_numbers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "seat_numbers" text array`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "seat_numbers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "seat_numbers" character varying(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_expired" ON "bookings" ("expires_at") WHERE ((status = 'INITIATED'::bookings_status_enum) AND (expires_at IS NOT NULL))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_active" ON "bookings" ("flight_id", "user_id") WHERE (status = ANY (ARRAY['INITIATED'::bookings_status_enum, 'PENDING'::bookings_status_enum, 'BOOKED'::bookings_status_enum]))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_user_status" ON "bookings" ("status", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_created_at" ON "bookings" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_flight_id" ON "bookings" ("flight_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_user_id" ON "bookings" ("user_id") `,
    );
  }
}
