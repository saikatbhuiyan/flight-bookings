import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '@app/database';
import {
  HealthModule,
  CommonModule,
  GlobalExceptionFilter,
  LoggingInterceptor,
  winstonLoggerConfig,
} from '@app/common';

// Entities
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Refund } from './entities/refund.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';

// Services
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { WebhookService } from './services/webhook.service';

// Controllers
import { PaymentIntentController } from './controllers/payment-intent.controller';
import { RefundController } from './controllers/refund.controller';
import { WebhookController } from './controllers/webhook.controller';

// Gateways
import { PaymentGatewayFactory } from './gateways/gateway.factory';
import { StripeGatewayProvider } from './gateways/stripe-gateway.provider';
import { PayPalGatewayProvider } from './gateways/paypal-gateway.provider';
import { CryptoGatewayProvider } from './gateways/crypto-gateway.provider';

// Config
import { rabbitmqConfig } from './config/rabbitmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot(
      [PaymentIntent, PaymentTransaction, Refund, PaymentAuditLog],
      [__dirname + '/migrations/*.{ts,js}'],
    ),
    TypeOrmModule.forFeature([
      PaymentIntent,
      PaymentTransaction,
      Refund,
      PaymentAuditLog,
    ]),
    CommonModule,
    WinstonModule.forRoot(winstonLoggerConfig),
    HealthModule,
    EventEmitterModule.forRoot(),
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [
    PaymentIntentController,
    RefundController,
    WebhookController,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    PaymentService,
    RefundService,
    WebhookService,
    // Gateway registry — each provider must be listed so DI can inject them
    // into PaymentGatewayFactory.
    PaymentGatewayFactory,
    StripeGatewayProvider,
    PayPalGatewayProvider,
    // CryptoGatewayProvider,
  ],
})
export class PaymentServiceModule { }
