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

/**
 * PayPal Payment Gateway Provider
 *
 * Handles: PAYPAL checkout flow.
 *
 * Implementation guide
 * ────────────────────
 * 1. Install the PayPal SDK:
 *      npm install @paypal/checkout-server-sdk
 * 2. Configure credentials via env:
 *      PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE (sandbox | live)
 * 3. Implement PayPal Orders v2 API when needed.
 *
 * PayPal docs: https://developer.paypal.com/docs/api/orders/v2/
 */
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

    // Flow:
    //   1. POST /v2/checkout/orders → get orderId + approve link
    //   2. Return clientSecret = approvalUrl (client redirects user there)
    //   3. After approval, client calls capturePayment(orderId)

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
