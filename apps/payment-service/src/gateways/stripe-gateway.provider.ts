import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
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
 * Stripe Payment Gateway Provider
 *
 * Handles the following payment methods through a single Stripe integration:
 *  • CARD       — standard card element / Payment Element
 *  • APPLE_PAY  — Stripe Payment Request Button (wallet)
 *  • GOOGLE_PAY — Stripe Payment Request Button (wallet)
 *
 * Apple Pay and Google Pay are NOT separate gateway integrations.  Stripe
 * surfaces them automatically through `automatic_payment_methods: { enabled: true }`.
 * The client renders the correct wallet button based on the browser/device.
 *
 * Docs: https://stripe.com/docs/payments/payment-methods/integration-options
 */
@Injectable()
export class StripeGatewayProvider implements IPaymentGateway {
    private readonly logger = new Logger(StripeGatewayProvider.name);
    private stripe: Stripe;

    constructor() {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }

        this.stripe = new Stripe(apiKey, {
            apiVersion: '2026-01-28.clover',
        });

        this.logger.log('Stripe payment gateway initialized (handles CARD, APPLE_PAY, GOOGLE_PAY)');
    }

    getGatewayName(): string {
        return 'stripe';
    }

    getSupportedPaymentMethods(): PaymentMethod[] {
        // Stripe handles all three through automatic_payment_methods
        return [PaymentMethod.CARD, PaymentMethod.APPLE_PAY, PaymentMethod.GOOGLE_PAY];
    }

    async createPaymentIntent(
        params: CreatePaymentIntentParams,
    ): Promise<PaymentIntent> {
        try {
            this.logger.log(
                `Creating Stripe PaymentIntent for booking ${params.bookingId} ` +
                `via method: ${params.paymentMethod}`,
            );

            const intentParams: Stripe.PaymentIntentCreateParams = {
                amount: params.amount,
                currency: params.currency.toLowerCase(),
                metadata: {
                    bookingId: params.bookingId.toString(),
                    userId: params.userId.toString(),
                    paymentMethod: params.paymentMethod,
                    ...params.metadata,
                },
                // automatic_payment_methods lets Stripe enable card, Apple Pay,
                // Google Pay and other methods in one go — no manual enumeration needed.
                automatic_payment_methods: { enabled: true },
            };

            const paymentIntent = await this.stripe.paymentIntents.create(intentParams);

            this.logger.log(`Stripe PaymentIntent created: ${paymentIntent.id}`);

            return {
                id: paymentIntent.id,
                gatewayPaymentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency.toUpperCase(),
                status: paymentIntent.status,
                clientSecret: paymentIntent.client_secret,
                paymentMethod: params.paymentMethod,
                metadata: paymentIntent.metadata as any,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create Stripe PaymentIntent: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async capturePayment(gatewayPaymentId: string): Promise<PaymentResult> {
        try {
            this.logger.log(`Capturing Stripe payment: ${gatewayPaymentId}`);

            const paymentIntent =
                await this.stripe.paymentIntents.retrieve(gatewayPaymentId);

            if (paymentIntent.status === 'requires_confirmation') {
                await this.stripe.paymentIntents.confirm(gatewayPaymentId);
            }

            if (paymentIntent.status === 'requires_capture') {
                await this.stripe.paymentIntents.capture(gatewayPaymentId);
            }

            const updated = await this.stripe.paymentIntents.retrieve(gatewayPaymentId);
            const success = updated.status === 'succeeded';

            return {
                success,
                transactionId: updated.id,
                amount: updated.amount,
                currency: updated.currency.toUpperCase(),
                status: updated.status,
                errorMessage: !success ? updated.last_payment_error?.message : undefined,
                rawResponse: updated,
            };
        } catch (error) {
            this.logger.error(
                `Failed to capture Stripe payment: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                transactionId: gatewayPaymentId,
                amount: 0,
                currency: 'USD',
                status: 'failed',
                errorMessage: error.message,
            };
        }
    }

    async refundPayment(params: RefundParams): Promise<RefundResult> {
        try {
            this.logger.log(`Creating Stripe refund for ${params.transactionId}`);

            const refund = await this.stripe.refunds.create({
                payment_intent: params.transactionId,
                amount: params.amount,
                reason: params.reason as any,
            });

            return {
                success: refund.status === 'succeeded',
                refundId: refund.id,
                amount: refund.amount,
                status: refund.status,
            };
        } catch (error) {
            this.logger.error(`Failed to create Stripe refund: ${error.message}`, error.stack);
            return {
                success: false,
                refundId: '',
                amount: params.amount,
                status: 'failed',
                errorMessage: error.message,
            };
        }
    }

    async verifyWebhook(payload: any, signature: string): Promise<WebhookEvent> {
        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!webhookSecret) {
                throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
            }

            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret,
            );

            this.logger.log(`Stripe webhook verified: ${event.type}`);

            return {
                type: event.type,
                paymentIntentId: event.data.object['id'],
                status: event.data.object['status'],
                data: event.data.object,
            };
        } catch (error) {
            this.logger.error(`Failed to verify Stripe webhook: ${error.message}`, error.stack);
            throw error;
        }
    }
}
