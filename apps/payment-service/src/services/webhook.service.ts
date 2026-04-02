import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentAuditLog, AuditAction } from '../entities/payment-audit-log.entity';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { PaymentService } from './payment.service';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        @InjectRepository(PaymentAuditLog)
        private auditLogRepository: Repository<PaymentAuditLog>,
        private gatewayFactory: PaymentGatewayFactory,
        private paymentService: PaymentService,
    ) { }

    /**
     * Handle Stripe webhook
     */
    async handleStripeWebhook(payload: any, signature: string): Promise<void> {
        this.logger.log('Processing Stripe webhook');

        try {
            // Get Stripe gateway
            const gateway = this.gatewayFactory.getByName('stripe');

            // Verify webhook signature
            const event = await gateway.verifyWebhook(payload, signature);

            // Create audit log
            await this.createAuditLog({
                entityType: 'webhook',
                entityId: event.paymentIntentId || 'unknown',
                action: AuditAction.WEBHOOK_RECEIVED,
                changes: { type: event.type, status: event.status },
            });

            // Handle different event types
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event);
                    break;

                case 'charge.refunded':
                    await this.handleRefundProcessed(event);
                    break;

                default:
                    this.logger.log(`Unhandled webhook event type: ${event.type}`);
            }

            this.logger.log(`Stripe webhook processed: ${event.type}`);
        } catch (error) {
            this.logger.error(`Failed to process Stripe webhook: ${error.message}`, error.stack);
            throw new BadRequestException('Webhook verification failed');
        }
    }

    /**
     * Handle PayPal webhook
     */
    async handlePayPalWebhook(payload: any, signature: string): Promise<void> {
        this.logger.log('Processing PayPal webhook');

        try {
            // Get PayPal gateway
            const gateway = this.gatewayFactory.getByName('paypal');

            // Verify webhook signature
            const event = await gateway.verifyWebhook(payload, signature);

            // Create audit log
            await this.createAuditLog({
                entityType: 'webhook',
                entityId: event.paymentIntentId || 'unknown',
                action: AuditAction.WEBHOOK_RECEIVED,
                changes: { type: event.type, status: event.status },
            });

            // Handle PayPal events (to be implemented when PayPal provider is complete)
            this.logger.log(`PayPal webhook processed: ${event.type}`);
        } catch (error) {
            this.logger.error(`Failed to process PayPal webhook: ${error.message}`, error.stack);
            throw new BadRequestException('Webhook verification failed');
        }
    }

    /**
     * Handle payment succeeded event
     */
    private async handlePaymentSucceeded(event: any): Promise<void> {
        this.logger.log(`Payment succeeded: ${event.paymentIntentId}`);

        try {
            // Capture the payment in our system
            await this.paymentService.capturePayment(event.paymentIntentId);
        } catch (error) {
            this.logger.error(`Failed to handle payment succeeded: ${error.message}`, error.stack);
            // Don't throw - webhook should return 200 even if processing fails
        }
    }

    /**
     * Handle payment failed event
     */
    private async handlePaymentFailed(event: any): Promise<void> {
        this.logger.log(`Payment failed: ${event.paymentIntentId}`);
        // Additional failure handling can be added here
    }

    /**
     * Handle refund processed event
     */
    private async handleRefundProcessed(event: any): Promise<void> {
        this.logger.log(`Refund processed: ${event.data.id}`);
        // Additional refund handling can be added here
    }

    /**
     * Create audit log entry
     */
    private async createAuditLog(data: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        changes?: Record<string, any>;
    }): Promise<void> {
        try {
            const auditLog = this.auditLogRepository.create(data);
            await this.auditLogRepository.save(auditLog);
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
        }
    }
}
