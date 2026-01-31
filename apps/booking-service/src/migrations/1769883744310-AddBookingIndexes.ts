import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookingIndexes1769883744310 implements MigrationInterface {
    name = 'AddBookingIndexes1769883744310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create standard indexes
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
      ON bookings(user_id);
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_flight_id 
      ON bookings(flight_id);
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status 
      ON bookings(status);
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
      ON bookings(created_at);
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
      ON bookings(user_id, status);
    `);

        // Create partial indexes for performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_active 
      ON bookings(user_id, flight_id) 
      WHERE status IN ('INITIATED', 'PENDING', 'BOOKED');
    `);

        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_expired 
      ON bookings(expires_at) 
      WHERE status = 'INITIATED' AND expires_at IS NOT NULL;
    `);

        // Add index for booking reference lookups
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference 
      ON bookings(booking_reference);
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_user_id;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_flight_id;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_status;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_created_at;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_user_status;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_active;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_expired;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_reference;`);
    }
}
