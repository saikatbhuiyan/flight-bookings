import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IMessageBroker } from '@app/common';
import { RabbitMQProvider } from './rabbitmq.provider';

export const MESSAGE_BROKER = 'MESSAGE_BROKER';

export interface MessageBrokerOptions {
  useClass?: any;
  useFactory?: (...args: any[]) => IMessageBroker | Promise<IMessageBroker>;
  inject?: any[];
}

@Module({})
export class MessageBrokerModule {
  static forRoot(options?: MessageBrokerOptions): DynamicModule {
    let messageBrokerProvider: Provider;

    if (options?.useFactory) {
      messageBrokerProvider = {
        provide: MESSAGE_BROKER,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    } else {
      messageBrokerProvider = {
        provide: MESSAGE_BROKER,
        useClass: options?.useClass || RabbitMQProvider,
      };
    }

    return {
      module: MessageBrokerModule,
      imports: [ConfigModule],
      providers: [messageBrokerProvider],
      exports: [MESSAGE_BROKER],
      global: true,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => IMessageBroker | Promise<IMessageBroker>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: MessageBrokerModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: MESSAGE_BROKER,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [MESSAGE_BROKER],
      global: true,
    };
  }
}
