import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCitiesTable1769390108705 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cities',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
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
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_cities_name" ON "cities" ("name");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_country_unique" ON "cities" ("name", "country");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cities_country" ON "cities" ("country");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('cities', 'idx_cities_name');
    await queryRunner.dropIndex('cities', 'idx_cities_country');
    await queryRunner.dropTable('cities');
  }
}
