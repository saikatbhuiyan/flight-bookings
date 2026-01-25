import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { AuthAudit } from '../entities/auth-audit.entity';
import { NotificationSettings } from '../entities/notification-settings.entity';

config({ path: 'apps/auth-service/.env' });

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'auth_db',
    entities: [User, AuthAudit, NotificationSettings],
    migrations: ['apps/auth-service/src/migrations/*.ts'],
    synchronize: false,
});
