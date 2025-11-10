import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';

@Module({})
export class DatabaseModule {
  static forRoot(entities: any[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) =>
            getDatabaseConfig(configService, entities),
          inject: [ConfigService],
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
