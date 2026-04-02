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
 * 3. Replace the TODO blocks below with the PayPal Orders v2 API.
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

        this.logger.log('PayPal payment gateway initialized (stub – see TODO comments)');
    }

    getGatewayName(): string {
        return 'paypal';
    }

    getSupportedPaymentMethods(): PaymentMethod[] {
        return [PaymentMethod.PAYPAL];
    }

    async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
        this.logger.log(`Creating PayPal order for booking ${params.bookingId}`);

        // TODO: implement PayPal Orders API
        // Flow:
        //   1. POST /v2/checkout/orders → get orderId + approve link
        //   2. Return clientSecret = approvalUrl (client redirects user there)
        //   3. After approval, client calls capturePayment(orderId)

        throw new Error(
            'PayPal gateway is not yet implemented. ' +
            'Install @paypal/checkout-server-sdk and fill in the TODO blocks.',
        );
    }

    async capturePayment(gatewayPaymentId: string): Promise<PaymentResult> {
        this.logger.log(`Capturing PayPal order: ${gatewayPaymentId}`);

        // TODO: POST /v2/checkout/orders/{orderId}/capture

        throw new Error('PayPal capturePayment not yet implemented');
    }

    async refundPayment(params: RefundParams): Promise<RefundResult> {
        this.logger.log(`Creating PayPal refund for ${params.transactionId}`);

        // TODO: POST /v2/payments/captures/{captureId}/refund

        throw new Error('PayPal refundPayment not yet implemented');
    }

    async verifyWebhook(payload: any, signature: string): Promise<WebhookEvent> {
        this.logger.log('Verifying PayPal webhook signature');

        // TODO: use PayPal SDK WebhooksApi.verifyWebhookSignature()

        throw new Error('PayPal verifyWebhook not yet implemented');
    }
}
