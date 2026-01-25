import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Booking } from '../../../../apps/booking-service/src/entities/booking.entity';

config({ path: 'apps/booking-service/.env' });

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'booking_db',
    entities: [Booking],
    migrations: ['apps/booking-service/src/migrations/*.ts'],
    synchronize: false,
});
