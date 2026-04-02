import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentIntent } from '../entities/payment-intent.entity';
import { PaymentAuditLog, AuditAction } from '../entities/payment-audit-log.entity';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { CreateRefundDto } from '../dto/create-refund.dto';

@Injectable()
export class RefundService {
    private readonly logger = new Logger(RefundService.name);

    constructor(
        @InjectRepository(Refund)
        private refundRepository: Repository<Refund>,
        @InjectRepository(PaymentTransaction)
        private transactionRepository: Repository<PaymentTransaction>,
        @InjectRepository(PaymentIntent)
        private paymentIntentRepository: Repository<PaymentIntent>,
        @InjectRepository(PaymentAuditLog)
        private auditLogRepository: Repository<PaymentAuditLog>,
        private gatewayFactory: PaymentGatewayFactory,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create a refund
     */
    async createRefund(dto: CreateRefundDto): Promise<Refund> {
        this.logger.log(`Creating refund for transaction ${dto.transactionId}`);

        try {
            // Find the original transaction
            const transaction = await this.transactionRepository.findOne({
                where: { id: dto.transactionId },
                relations: ['paymentIntent'],
            });

            if (!transaction) {
                throw new BadRequestException(`Transaction ${dto.transactionId} not found`);
            }

            // Validate refund amount
            if (dto.amount > transaction.amount) {
                throw new BadRequestException(
                    `Refund amount (${dto.amount}) cannot exceed transaction amount (${transaction.amount})`,
                );
            }

            // Get the appropriate gateway by the processor name stored on the transaction
            const gateway = this.gatewayFactory.getByName(transaction.gateway);

            // Process refund with gateway
            const result = await gateway.refundPayment({
                transactionId: transaction.gatewayTransactionId,
                amount: dto.amount,
                reason: dto.reason,
            });

            // Create refund record
            const refund = this.refundRepository.create({
                paymentTransactionId: transaction.id,
                bookingId: dto.bookingId,
                amount: dto.amount,
                reason: dto.reason,
                status: result.success ? RefundStatus.SUCCEEDED : RefundStatus.FAILED,
                gatewayRefundId: result.refundId,
            });

            const savedRefund = await this.refundRepository.save(refund);

            // Create audit log
            await this.createAuditLog({
                entityType: 'refund',
                entityId: savedRefund.id,
                action: result.success ? AuditAction.REFUND_PROCESSED : AuditAction.REFUND_CREATED,
                changes: { bookingId: dto.bookingId, amount: dto.amount, reason: dto.reason },
            });

            // Emit event
            if (result.success) {
                this.eventEmitter.emit('payment.refunded', {
                    refundId: savedRefund.id,
                    bookingId: dto.bookingId,
                    amount: dto.amount,
                    transactionId: transaction.id,
                });
            }

            this.logger.log(`Refund ${result.success ? 'succeeded' : 'failed'}: ${savedRefund.id}`);

            return savedRefund;
        } catch (error) {
            this.logger.error(`Failed to create refund: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get refunds for a booking
     */
    async getRefundsByBooking(bookingId: number): Promise<Refund[]> {
        return this.refundRepository.find({
            where: { bookingId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Create audit log entry
     */
    private async createAuditLog(data: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        userId?: number;
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
