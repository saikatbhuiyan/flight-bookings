import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: 'apps/flight-service/.env' });

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flight_db',
    entities: [
        'apps/flight-service/src/entities/*.entity.ts',
    ],
    migrations: ['apps/flight-service/src/migrations/*.ts'],
    synchronize: false,
});
