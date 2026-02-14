import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSeatsTable1769448089690 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seat_type') THEN
          CREATE TYPE seat_type AS ENUM ('ECONOMY', 'BUSINESS', 'FIRST_CLASS', 'PREMIUM_ECONOMY');
        END IF;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'seats',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'airplane_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'row',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'col',
            type: 'char',
            length: '1',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'seat_type',
            default: "'ECONOMY'",
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

    // Create unique constraint idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_seats_airplane_row_col') THEN
          ALTER TABLE seats 
          ADD CONSTRAINT uq_seats_airplane_row_col 
          UNIQUE (airplane_id, row, col);
        END IF;
      END $$;
    `);

    // Create indexes
    // Create indexes idempotently
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_seats_airplane_id" ON "seats" ("airplane_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "seats_airplane_row_col_unique" ON "seats" ("airplane_id", "row", "col");
      CREATE INDEX IF NOT EXISTS "idx_seats_type" ON "seats" ("type");
    `);

    // Create foreign key
    // Create foreign key idempotently
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_airplane_seats') THEN
          ALTER TABLE seats ADD CONSTRAINT "FK_airplane_seats" FOREIGN KEY ("airplane_id") REFERENCES "airplanes"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('seats');
    await queryRunner.query(`DROP TYPE IF EXISTS seat_type`);
  }
}
