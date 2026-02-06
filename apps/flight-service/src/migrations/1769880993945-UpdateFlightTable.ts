import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFlightTable1769880993945 implements MigrationInterface {
  name = 'UpdateFlightTable1769880993945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS cities_name_idx`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX cities_name_country_unique ON cities(name, country)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX seats_airplane_row_col_unique ON seats(airplane_id, row, col)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX flights_number_departure_unique ON flights(flight_number, departure_time)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS cities_name_country_unique`);
    await queryRunner.query(`CREATE INDEX cities_name_idx ON cities(name)`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS seats_airplane_row_col_unique`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS flights_number_departure_unique`,
    );
  }
}
