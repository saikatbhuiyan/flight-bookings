import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentIntent, PaymentIntentStatus } from '../entities/payment-intent.entity';
import {
    PaymentTransaction,
    TransactionType,
    TransactionStatus,
} from '../entities/payment-transaction.entity';
import { PaymentAuditLog, AuditAction } from '../entities/payment-audit-log.entity';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { IPaymentGateway } from '../gateways/payment-gateway.interface';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        @InjectRepository(PaymentIntent)
        private paymentIntentRepository: Repository<PaymentIntent>,
        @InjectRepository(PaymentTransaction)
        private transactionRepository: Repository<PaymentTransaction>,
        @InjectRepository(PaymentAuditLog)
        private auditLogRepository: Repository<PaymentAuditLog>,
        private gatewayFactory: PaymentGatewayFactory,
        private eventEmitter: EventEmitter2,
    ) {
        this.logger.log('Payment service initialized');
    }

    /**
     * Create a payment intent
     */
    async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<PaymentIntent> {
        this.logger.log(`Creating payment intent for booking ${dto.bookingId}`);

        try {
            // Get the appropriate gateway (either from DTO or default)
            const gateway = this.gatewayFactory.create(dto.gateway as any);
            this.logger.log(`Using gateway: ${gateway.getGatewayName()}`);

            // Create payment intent with gateway
            const gatewayIntent = await gateway.createPaymentIntent({
                bookingId: dto.bookingId,
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency || 'USD',
                metadata: dto.metadata,
            });

            // Save to database
            const paymentIntent = this.paymentIntentRepository.create({
                bookingId: dto.bookingId,
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency || 'USD',
                gateway: gateway.getGatewayName(),
                gatewayPaymentId: gatewayIntent.gatewayPaymentId,
                status: PaymentIntentStatus.PENDING,
                clientSecret: gatewayIntent.clientSecret,
                metadata: dto.metadata,
            });

            const savedIntent = await this.paymentIntentRepository.save(paymentIntent);


            // Create audit log
            await this.createAuditLog({
                entityType: 'payment_intent',
                entityId: savedIntent.id,
                action: AuditAction.INTENT_CREATED,
                userId: dto.userId,
                changes: { bookingId: dto.bookingId, amount: dto.amount },
            });

            // Emit event
            this.eventEmitter.emit('payment.intent.created', {
                paymentIntentId: savedIntent.id,
                bookingId: dto.bookingId,
                amount: dto.amount,
                clientSecret: savedIntent.clientSecret,
            });

            this.logger.log(`Payment intent created: ${savedIntent.id}`);

            return savedIntent;
        } catch (error) {
            this.logger.error(`Failed to create payment intent: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get payment intent by ID
     */
    async getPaymentIntent(id: string): Promise<PaymentIntent> {
        const intent = await this.paymentIntentRepository.findOne({ where: { id } });
        if (!intent) {
            throw new NotFoundException(`Payment intent ${id} not found`);
        }
        return intent;
    }

    /**
     * Get payment intent by booking ID
     */
    async getPaymentIntentByBooking(bookingId: number): Promise<PaymentIntent> {
        const intent = await this.paymentIntentRepository.findOne({
            where: { bookingId },
            order: { createdAt: 'DESC' },
        });
        if (!intent) {
            throw new NotFoundException(`Payment intent for booking ${bookingId} not found`);
        }
        return intent;
    }

    /**
     * Capture/confirm a payment
     */
    async capturePayment(gatewayPaymentId: string): Promise<PaymentTransaction> {
        this.logger.log(`Capturing payment: ${gatewayPaymentId}`);

        try {
            // Find payment intent
            const intent = await this.paymentIntentRepository.findOne({
                where: { gatewayPaymentId },
            });

            if (!intent) {
                throw new NotFoundException(`Payment intent ${gatewayPaymentId} not found`);
            }

            // Get the appropriate gateway from stored gateway name
            const gateway = this.gatewayFactory.create(intent.gateway as any);

            // Capture payment with gateway
            const result = await gateway.capturePayment(gatewayPaymentId);

            // Create transaction record
            const transaction = this.transactionRepository.create({
                paymentIntentId: intent.id,
                transactionType: TransactionType.CHARGE,
                amount: result.amount,
                currency: result.currency,
                gateway: gateway.getGatewayName(),
                gatewayTransactionId: result.transactionId,
                status: result.success ? TransactionStatus.SUCCEEDED : TransactionStatus.FAILED,
                errorMessage: result.errorMessage,
                rawResponse: result.rawResponse,
            });


            const savedTransaction = await this.transactionRepository.save(transaction);

            // Update payment intent status
            intent.status = result.success
                ? PaymentIntentStatus.SUCCEEDED
                : PaymentIntentStatus.FAILED;
            await this.paymentIntentRepository.save(intent);

            // Create audit log
            await this.createAuditLog({
                entityType: 'payment_transaction',
                entityId: savedTransaction.id,
                action: result.success ? AuditAction.PAYMENT_CAPTURED : AuditAction.PAYMENT_FAILED,
                userId: intent.userId,
                changes: { status: result.status, amount: result.amount },
            });

            // Emit event
            if (result.success) {
                this.eventEmitter.emit('payment.succeeded', {
                    paymentIntentId: intent.id,
                    transactionId: savedTransaction.id,
                    bookingId: intent.bookingId,
                    amount: result.amount,
                });
            } else {
                this.eventEmitter.emit('payment.failed', {
                    paymentIntentId: intent.id,
                    bookingId: intent.bookingId,
                    errorMessage: result.errorMessage,
                });
            }

            this.logger.log(
                `Payment ${result.success ? 'succeeded' : 'failed'}: ${savedTransaction.id}`,
            );

            return savedTransaction;
        } catch (error) {
            this.logger.error(`Failed to capture payment: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Create audit log entry
     */
    private async createAuditLog(data: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        userId?: number;
        ipAddress?: string;
        userAgent?: string;
        changes?: Record<string, any>;
    }): Promise<void> {
        try {
            const auditLog = this.auditLogRepository.create(data);
            await this.auditLogRepository.save(auditLog);
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
            // Don't throw - audit log failure shouldn't break payment flow
        }
    }
}
