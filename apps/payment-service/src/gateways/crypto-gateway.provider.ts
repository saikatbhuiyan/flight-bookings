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
 * Crypto Payment Gateway Provider
 *
 * Handles: CRYPTO (BTC, ETH, USDC, etc.) via Coinbase Commerce.
 *
 * Implementation guide
 * ────────────────────
 * 1. Create a free Coinbase Commerce account: https://commerce.coinbase.com/
 * 2. Install the SDK (optional — it's a simple REST API):
 *      npm install coinbase-commerce-node
 *    Or call the API directly with fetch / axios.
 * 3. Set env vars:
 *      COINBASE_COMMERCE_API_KEY   — from dashboard
 *      COINBASE_COMMERCE_WEBHOOK_SECRET — from dashboard → webhook settings
 * 4. Replace TODO blocks below with actual API calls.
 *
 * Flow (differs from card payments):
 *   1. createPaymentIntent → creates a Coinbase Commerce "Charge"
 *      Returns a hosted_url the customer visits to select their crypto & pay.
 *      clientSecret = hosted_url
 *   2. Coinbase sends a webhook when payment is detected on-chain.
 *      verifyWebhook → parse + verify the webhook.
 *   3. capturePayment is effectively a no-op (Coinbase auto-captures).
 *   4. Refunds are NOT supported by Coinbase Commerce; a manual transfer
 *      from your wallet is required.
 *
 * Docs: https://docs.cloud.coinbase.com/commerce/reference/
 *
 * Alternative processors: NOWPayments, BitPay, CoinPayments.
 */
@Injectable()
export class CryptoGatewayProvider implements IPaymentGateway {
    private readonly logger = new Logger(CryptoGatewayProvider.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.commerce.coinbase.com';

    constructor() {
        this.apiKey = process.env.COINBASE_COMMERCE_API_KEY || '';

        if (!this.apiKey) {
            this.logger.warn(
                'COINBASE_COMMERCE_API_KEY is not configured. ' +
                'Crypto payments will throw on use.',
            );
        }

        this.logger.log('Crypto payment gateway initialized (Coinbase Commerce stub)');
    }

    getGatewayName(): string {
        return 'crypto';
    }

    getSupportedPaymentMethods(): PaymentMethod[] {
        return [PaymentMethod.CRYPTO];
    }

    async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
        this.logger.log(`Creating Coinbase Commerce charge for booking ${params.bookingId}`);

        if (!this.apiKey) {
            throw new Error('COINBASE_COMMERCE_API_KEY is not configured');
        }

        // TODO: call Coinbase Commerce Charges API
        //
        // const response = await fetch(`${this.baseUrl}/charges`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'X-CC-Api-Key': this.apiKey,
        //         'X-CC-Version': '2018-03-22',
        //     },
        //     body: JSON.stringify({
        //         name: `Flight Booking #${params.bookingId}`,
        //         description: `Payment for booking ${params.bookingId}`,
        //         local_price: {
        //             amount: (params.amount / 100).toFixed(2),  // convert cents → dollars
        //             currency: params.currency,
        //         },
        //         pricing_type: 'fixed_price',
        //         metadata: { bookingId: params.bookingId, userId: params.userId },
        //         redirect_url: process.env.CRYPTO_REDIRECT_URL,
        //         cancel_url:   process.env.CRYPTO_CANCEL_URL,
        //     }),
        // });
        // const { data: charge } = await response.json();
        //
        // return {
        //     id: charge.id,
        //     gatewayPaymentId: charge.id,
        //     amount: params.amount,
        //     currency: params.currency,
        //     status: charge.timeline[0].status,   // 'NEW'
        //     clientSecret: charge.hosted_url,      // redirect the customer here
        //     paymentMethod: params.paymentMethod,
        //     metadata: params.metadata,
        // };

        throw new Error(
            'CryptoGatewayProvider.createPaymentIntent is not yet implemented. ' +
            'See TODO comments above.',
        );
    }

    async capturePayment(gatewayPaymentId: string): Promise<PaymentResult> {
        this.logger.log(
            `Crypto capture called for ${gatewayPaymentId}. ` +
            'Coinbase Commerce auto-captures on-chain — verifying status.',
        );

        // TODO: GET /charges/{charge_id} and check timeline for CONFIRMED or COMPLETED status

        throw new Error('CryptoGatewayProvider.capturePayment not yet implemented');
    }

    async refundPayment(params: RefundParams): Promise<RefundResult> {
        // Coinbase Commerce does not support programmatic refunds.
        // This must be handled manually via wallet transfer.
        this.logger.warn(
            `Crypto refund requested for ${params.transactionId}. ` +
            'Coinbase Commerce does not support programmatic refunds. Manual transfer required.',
        );

        return {
            success: false,
            refundId: '',
            amount: params.amount,
            status: 'unsupported',
            errorMessage:
                'Cryptocurrency refunds require a manual transfer from your wallet. ' +
                'Contact support to initiate the refund process.',
        };
    }

    async verifyWebhook(payload: any, signature: string): Promise<WebhookEvent> {
        this.logger.log('Verifying Coinbase Commerce webhook signature');

        const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET is not configured');
        }

        // TODO: verify the HMAC-SHA256 signature header (X-CC-Webhook-Signature)
        //
        // import { createHmac } from 'crypto';
        // const computed = createHmac('sha256', webhookSecret)
        //     .update(JSON.stringify(payload))
        //     .digest('hex');
        // if (computed !== signature) throw new Error('Invalid webhook signature');
        //
        // Map Coinbase event types to our WebhookEvent shape:
        // charge:confirmed  → payment succeeded
        // charge:failed     → payment failed
        // charge:delayed    → underpaid / delayed — treat as pending

        throw new Error('CryptoGatewayProvider.verifyWebhook not yet implemented');
    }
}
