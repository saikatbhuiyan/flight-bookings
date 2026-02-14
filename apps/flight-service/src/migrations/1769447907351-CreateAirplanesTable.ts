import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAirplanesTable1769447907351 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'airplanes',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'model_number',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'total_capacity',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'economy_seats',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'business_seats',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'first_class_seats',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'premium_economy_seats',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'year_manufactured',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'max_range_km',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'cruising_speed_kmh',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_airplanes_model_number" ON "airplanes" ("model_number");
      CREATE INDEX IF NOT EXISTS "idx_airplanes_manufacturer" ON "airplanes" ("manufacturer");
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_airplanes_registration_number" ON "airplanes" ("registration_number");
      CREATE INDEX IF NOT EXISTS "idx_airplanes_active" ON "airplanes" ("active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('airplanes', true);
  }
}
