import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAirportsTable1769447107324 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'airports',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '3',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'icao_code',
            type: 'varchar',
            length: '4',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'city_id',
            type: 'int',
            isNullable: false,
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
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_airports_code" ON "airports" ("code");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_airports_name" ON "airports" ("name");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_airports_city_id" ON "airports" ("city_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_airports_active" ON "airports" ("active");
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_35db242a805855ae374834fd9f8') THEN
          ALTER TABLE "airports" 
          ADD CONSTRAINT "FK_35db242a805855ae374834fd9f8" 
          FOREIGN KEY ("city_id") REFERENCES "cities"("id") 
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('airports', 'idx_airports_code');
    await queryRunner.dropIndex('airports', 'idx_airports_name');
    await queryRunner.dropIndex('airports', 'idx_airports_city_id');
    await queryRunner.dropIndex('airports', 'idx_airports_active');
    await queryRunner.dropForeignKey('airports', 'airports_city_id');
    await queryRunner.dropTable('airports');
  }
}
