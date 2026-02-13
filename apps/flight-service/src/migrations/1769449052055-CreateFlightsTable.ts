import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFlightsTable1769449052055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flight_status') THEN
          CREATE TYPE flight_status AS ENUM (
            'SCHEDULED', 
            'DELAYED', 
            'BOARDING', 
            'DEPARTED', 
            'IN_FLIGHT', 
            'ARRIVED', 
            'CANCELLED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'flights',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'flight_number',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'airplane_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'departure_airport_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'arrival_airport_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'departure_time',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'arrival_time',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'boarding_gate',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'terminal',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'economy_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'business_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'first_class_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'premium_economy_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'economy_seats_available',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'business_seats_available',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'first_class_seats_available',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'premium_economy_seats_available',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'flight_status',
            default: "'SCHEDULED'",
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
            isNullable: false,
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
      true, // ifNotExists: true
    );

    // Add check constraints idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_flights_times') THEN
          ALTER TABLE flights 
          ADD CONSTRAINT chk_flights_times 
          CHECK (departure_time < arrival_time);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_flights_airports') THEN
          ALTER TABLE flights 
          ADD CONSTRAINT chk_flights_airports 
          CHECK (departure_airport_id != arrival_airport_id);
        END IF;
      END $$;
    `);

    // Create indexes idempotently
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_flights_flight_number" ON "flights" ("flight_number");
      CREATE UNIQUE INDEX IF NOT EXISTS "flights_number_departure_unique" ON "flights" ("flight_number", "departure_time");
      CREATE INDEX IF NOT EXISTS "idx_flights_departure" ON "flights" ("departure_airport_id", "departure_time");
      CREATE INDEX IF NOT EXISTS "idx_flights_arrival" ON "flights" ("arrival_airport_id", "arrival_time");
      CREATE INDEX IF NOT EXISTS "idx_flights_status" ON "flights" ("status");
      CREATE INDEX IF NOT EXISTS "idx_flights_departure_time" ON "flights" ("departure_time");
    `);

    // Create foreign keys idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_airplane_flights') THEN
          ALTER TABLE flights ADD CONSTRAINT "FK_airplane_flights" FOREIGN KEY ("airplane_id") REFERENCES "airplanes"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_departure_airport_flights') THEN
          ALTER TABLE flights ADD CONSTRAINT "FK_departure_airport_flights" FOREIGN KEY ("departure_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_arrival_airport_flights') THEN
          ALTER TABLE flights ADD CONSTRAINT "FK_arrival_airport_flights" FOREIGN KEY ("arrival_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('flights');
    await queryRunner.query(`DROP TYPE IF EXISTS flight_status`);
  }
}
