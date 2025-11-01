import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IStorageProvider } from '@app/common';
import { S3StorageProvider } from './storage.provider';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageModuleOptions {
  useClass?: any;
  useFactory?: (...args: any[]) => IStorageProvider | Promise<IStorageProvider>;
  inject?: any[];
}

@Module({})
export class StorageModule {
  static forRoot(options?: StorageModuleOptions): DynamicModule {
    let storageProvider: Provider;

    if (options?.useFactory) {
      storageProvider = {
        provide: STORAGE_PROVIDER,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    } else {
      storageProvider = {
        provide: STORAGE_PROVIDER,
        useClass: options?.useClass || S3StorageProvider,
      };
    }

    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [storageProvider],
      exports: [STORAGE_PROVIDER],
      global: true,
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => IStorageProvider | Promise<IStorageProvider>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [STORAGE_PROVIDER],
      global: true,
    };
  }
}
