import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateSeatsTable1769448089690 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type
        await queryRunner.query(`
            CREATE TYPE seat_type AS ENUM ('ECONOMY', 'BUSINESS', 'FIRST_CLASS', 'PREMIUM_ECONOMY');
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

        // Create unique constraint
        await queryRunner.query(`
      ALTER TABLE seats 
      ADD CONSTRAINT uq_seats_airplane_row_col 
      UNIQUE (airplane_id, row, col);
    `);

        // Create indexes
        await queryRunner.createIndex(
            'seats',
            new TableIndex({
                name: 'idx_seats_airplane_id',
                columnNames: ['airplane_id'],
            }),
        );

        await queryRunner.createIndex(
            'seats',
            new TableIndex({
                name: 'idx_seats_type',
                columnNames: ['type'],
            }),
        );

        // Create foreign key
        await queryRunner.createForeignKey(
            'seats',
            new TableForeignKey({
                columnNames: ['airplane_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'airplanes',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('seats');
        await queryRunner.query(`DROP TYPE IF EXISTS seat_type`);
    }
}
