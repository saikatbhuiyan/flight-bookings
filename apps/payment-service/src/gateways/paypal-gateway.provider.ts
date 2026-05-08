import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentMethod,
  CreatePaymentIntentParams,
  PaymentIntent,
  PaymentResult,
  RefundParams,
  RefundResult,
  WebhookEvent,
} from './payment-gateway.interface';

@Injectable()
export class PayPalGatewayProvider implements IPaymentGateway {
  private readonly logger = new Logger(PayPalGatewayProvider.name);

  constructor() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn(
        'PayPal credentials not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET). ' +
          'PayPal gateway will throw on use.',
      );
    }

    this.logger.log('PayPal payment gateway initialized (not implemented)');
  }

  getGatewayName(): string {
    return 'paypal';
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [PaymentMethod.PAYPAL];
  }

  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    this.logger.log(`Creating PayPal order for booking ${params.bookingId}`);

    throw new Error(
      'PayPal gateway is not implemented yet. Use Stripe for now or implement PayPal Orders v2 integration.',
    );
  }

  capturePayment(gatewayPaymentId: string): Promise<PaymentResult> {
    this.logger.log(`Capturing PayPal order: ${gatewayPaymentId}`);

    throw new Error('PayPal capturePayment not yet implemented');
  }

  refundPayment(params: RefundParams): Promise<RefundResult> {
    this.logger.log(`Creating PayPal refund for ${params.transactionId}`);

    throw new Error('PayPal refundPayment not yet implemented');
  }

  verifyWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    this.logger.log('Verifying PayPal webhook signature');
    void payload;
    void signature;

    throw new Error('PayPal verifyWebhook not yet implemented');
  }
}
