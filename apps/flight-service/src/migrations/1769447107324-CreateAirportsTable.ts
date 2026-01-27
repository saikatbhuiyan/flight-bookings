import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateAirportsTable1769447107324 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'airports',
                columns: [
                    {
                        name: 'id',
                        type: 'serial',
                        isPrimary: true
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

        await queryRunner.createIndex(
            'airports',
            new TableIndex({
                name: 'idx_airports_code',
                columnNames: ['code'],
                isUnique: true,
            }),
        );

        await queryRunner.createIndex(
            'airports',
            new TableIndex({
                name: 'idx_airports_name',
                columnNames: ['name'],
            }),
        );

        await queryRunner.createIndex(
            'airports',
            new TableIndex({
                name: 'idx_airports_city_id',
                columnNames: ['city_id'],
            }),
        );

        await queryRunner.createIndex(
            'airports',
            new TableIndex({
                name: 'idx_airports_active',
                columnNames: ['active'],
            }),
        );

        await queryRunner.createForeignKey(
            'airports',
            new TableForeignKey({
                columnNames: ['city_id'],
                referencedTableName: 'cities',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
            }),
        );

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
