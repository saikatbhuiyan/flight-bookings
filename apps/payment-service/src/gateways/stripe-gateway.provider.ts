import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
    IPaymentGateway,
    CreatePaymentIntentParams,
    PaymentIntent,
    PaymentResult,
    RefundParams,
    RefundResult,
    WebhookEvent,
} from './payment-gateway.interface';

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

        this.logger.log('Stripe payment gateway initialized');
    }

    getGatewayName(): string {
        return 'stripe';
    }

    async createPaymentIntent(
        params: CreatePaymentIntentParams,
    ): Promise<PaymentIntent> {
        try {
            this.logger.log(
                `Creating Stripe payment intent for booking ${params.bookingId}`,
            );

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: params.amount,
                currency: params.currency.toLowerCase(),
                metadata: {
                    bookingId: params.bookingId.toString(),
                    userId: params.userId.toString(),
                    ...params.metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            this.logger.log(
                `Stripe payment intent created: ${paymentIntent.id}`,
            );

            return {
                id: paymentIntent.id,
                gatewayPaymentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency.toUpperCase(),
                status: paymentIntent.status,
                clientSecret: paymentIntent.client_secret,
                metadata: paymentIntent.metadata,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create Stripe payment intent: ${error.message}`,
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

            // If payment intent requires confirmation, confirm it
            if (paymentIntent.status === 'requires_confirmation') {
                await this.stripe.paymentIntents.confirm(gatewayPaymentId);
            }

            // If payment intent requires capture, capture it
            if (paymentIntent.status === 'requires_capture') {
                await this.stripe.paymentIntents.capture(gatewayPaymentId);
            }

            const updatedIntent =
                await this.stripe.paymentIntents.retrieve(gatewayPaymentId);

            const success = updatedIntent.status === 'succeeded';

            this.logger.log(
                `Stripe payment ${gatewayPaymentId} ${success ? 'succeeded' : 'failed'}`,
            );

            return {
                success,
                transactionId: updatedIntent.id,
                amount: updatedIntent.amount,
                currency: updatedIntent.currency.toUpperCase(),
                status: updatedIntent.status,
                errorMessage: !success ? updatedIntent.last_payment_error?.message : undefined,
                rawResponse: updatedIntent,
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

            this.logger.log(`Stripe refund created: ${refund.id}`);

            return {
                success: refund.status === 'succeeded',
                refundId: refund.id,
                amount: refund.amount,
                status: refund.status,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create Stripe refund: ${error.message}`,
                error.stack,
            );

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
            this.logger.error(
                `Failed to verify Stripe webhook: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
