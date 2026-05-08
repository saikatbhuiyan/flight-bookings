import { Provider } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PaymentClient } from './payment-client.interface';
import { PaymentMockClient } from './payment-mock.client';
import { PaymentRpcClient, PAYMENT_RMQ_CLIENT } from './payment-rpc.client';
import { BookingPaymentMode, resolveBookingPaymentMode } from './payment-mode';

export const PAYMENT_CLIENT = Symbol('PAYMENT_CLIENT');

export const paymentProviders: Provider[] = [
  {
    provide: PAYMENT_RMQ_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const rabbitmqUrl = configService.get<string>('RABBITMQ_URL') || 'amqp://admin:admin@localhost:5672';
      const queue = configService.get<string>('PAYMENT_QUEUE') || 'payment_queue';

      return ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue,
          queueOptions: { durable: true },
        },
      });
    },
  },
  PaymentRpcClient,
  PaymentMockClient,
  {
    provide: PAYMENT_CLIENT,
    inject: [ConfigService, PaymentRpcClient, PaymentMockClient],
    useFactory: (configService: ConfigService, rpc: PaymentRpcClient, mock: PaymentMockClient): PaymentClient => {
      return resolveBookingPaymentMode(configService) === BookingPaymentMode.PAYMENT_SERVICE ? rpc : mock;
    },
  },
];
