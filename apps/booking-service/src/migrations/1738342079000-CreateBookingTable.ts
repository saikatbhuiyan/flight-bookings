import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBookingTable1738342079000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE booking_status AS ENUM (
        'INITIATED', 
        'PENDING', 
        'BOOKED', 
        'CANCELLED', 
        'EXPIRED', 
        'REFUNDED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE payment_status AS ENUM (
        'PENDING', 
        'PROCESSING', 
        'COMPLETED', 
        'FAILED', 
        'REFUNDED'
      );
    `);

    // Create bookings table
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'booking_reference',
            type: 'varchar',
            length: '10',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'flight_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'no_of_seats',
            type: 'int',
            isNullable: false,
            default: 1,
          },
          {
            name: 'total_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'booking_status',
            default: "'INITIATED'",
            isNullable: false,
          },
          {
            name: 'payment_status',
            type: 'payment_status',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'passenger_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'passenger_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passenger_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'flight_number',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'departure_airport_code',
            type: 'varchar',
            length: '3',
            isNullable: true,
          },
          {
            name: 'arrival_airport_code',
            type: 'varchar',
            length: '3',
            isNullable: true,
          },
          {
            name: 'departure_time',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'arrival_time',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'seat_numbers',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'seat_class',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payment_transaction_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'paid_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'cancellation_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refund_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'booking_source',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_flight_id',
        columnNames: ['flight_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    // Create partial index for active bookings
    await queryRunner.query(`
      CREATE INDEX idx_bookings_active 
      ON bookings (user_id, flight_id) 
      WHERE status IN ('INITIATED', 'PENDING', 'BOOKED');
    `);

    // Create index for expired bookings cleanup
    await queryRunner.query(`
      CREATE INDEX idx_bookings_expired 
      ON bookings (expires_at) 
      WHERE status = 'INITIATED' AND expires_at IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings');
    await queryRunner.query(`DROP TYPE IF EXISTS booking_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status`);
  }
}
