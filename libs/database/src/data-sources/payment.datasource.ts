import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

// Use glob patterns for entities and migrations
const entitiesPath = join(__dirname, '../../../apps/payment-service/src/entities/*.entity{.ts,.js}');
const migrationsPath = join(__dirname, '../../../apps/payment-service/src/migrations/*{.ts,.js}');

export const paymentDataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'payment_db',
    entities: [entitiesPath],
    migrations: [migrationsPath],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
};

const paymentDataSource = new DataSource(paymentDataSourceOptions);

export default paymentDataSource;
