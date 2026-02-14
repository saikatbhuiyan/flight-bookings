import {
    MigrationInterface,
    QueryRunner,
    Table,
} from 'typeorm';

export class AddProcessedEvent1770486672901 implements MigrationInterface {
    name = 'AddProcessedEvent1770486672901';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'processed_events',
                columns: [
                    {
                        name: 'id',
                        type: 'serial',
                        isPrimary: true,
                    },
                    {
                        name: 'event_id',
                        type: 'varchar',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'event_type',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'aggregate_id',
                        type: 'varchar',
                        isNullable: false,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        default: 'now()',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('processed_events');
    }
}
