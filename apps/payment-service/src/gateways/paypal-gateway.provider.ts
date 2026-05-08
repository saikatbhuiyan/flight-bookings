import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
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
    return this.unsupported('createPaymentIntent');
  }

  capturePayment(gatewayPaymentId: string): Promise<PaymentResult> {
    this.logger.log(`Capturing PayPal order: ${gatewayPaymentId}`);
    return this.unsupported('capturePayment');
  }

  refundPayment(params: RefundParams): Promise<RefundResult> {
    this.logger.log(`Creating PayPal refund for ${params.transactionId}`);
    return this.unsupported('refundPayment');
  }

  verifyWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    this.logger.log('Verifying PayPal webhook signature');
    void payload;
    void signature;
    return this.unsupported('verifyWebhook');
  }

  private unsupported(operation: string): never {
    throw new NotImplementedException(`PayPal ${operation} is not available yet. Use Stripe or add PayPal Orders v2.`);
  }
}
