import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFlightsTable1769449052055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      CREATE TYPE flight_status AS ENUM (
        'SCHEDULED', 
        'DELAYED', 
        'BOARDING', 
        'DEPARTED', 
        'IN_FLIGHT', 
        'ARRIVED', 
        'CANCELLED'
      );
    `);

    await queryRunner.dropTable('flights', true);

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
      true,
    );

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE flights 
      ADD CONSTRAINT chk_flights_times 
      CHECK (departure_time < arrival_time);
    `);

    await queryRunner.query(`
      ALTER TABLE flights 
      ADD CONSTRAINT chk_flights_airports 
      CHECK (departure_airport_id != arrival_airport_id);
    `);

    // Create indexes
    await queryRunner.createIndex(
      'flights',
      new TableIndex({
        name: 'idx_flights_flight_number',
        columnNames: ['flight_number'],
      }),
    );

    await queryRunner.createIndex(
      'flights',
      new TableIndex({
        name: 'idx_flights_departure',
        columnNames: ['departure_airport_id', 'departure_time'],
      }),
    );

    await queryRunner.createIndex(
      'flights',
      new TableIndex({
        name: 'idx_flights_arrival',
        columnNames: ['arrival_airport_id', 'arrival_time'],
      }),
    );

    await queryRunner.createIndex(
      'flights',
      new TableIndex({
        name: 'idx_flights_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'flights',
      new TableIndex({
        name: 'idx_flights_departure_time',
        columnNames: ['departure_time'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'flights',
      new TableForeignKey({
        columnNames: ['airplane_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'airplanes',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'flights',
      new TableForeignKey({
        columnNames: ['departure_airport_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'airports',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'flights',
      new TableForeignKey({
        columnNames: ['arrival_airport_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'airports',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('flights');
    await queryRunner.query(`DROP TYPE IF EXISTS flight_status`);
  }
}
