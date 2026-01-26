import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

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

        await queryRunner.createIndex(
            'cities',
            new TableIndex({
                name: 'idx_cities_name',
                columnNames: ['name'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'cities',
            new TableIndex({
                name: 'idx_cities_country',
                columnNames: ['country'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('cities', 'idx_cities_name');
        await queryRunner.dropIndex('cities', 'idx_cities_country');
        await queryRunner.dropTable('cities');
    }

}
