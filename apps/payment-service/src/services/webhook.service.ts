import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PaymentAuditLog, AuditAction } from '../entities/payment-audit-log.entity';
import { WebhookEventEntity, WebhookEventStatus } from '../entities/webhook-event.entity';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { PaymentService } from './payment.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentAuditLog)
    private readonly auditLogRepository: Repository<PaymentAuditLog>,
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepository: Repository<WebhookEventEntity>,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly paymentService: PaymentService,
  ) {}

  async handleStripeWebhook(payload: any, signature: string): Promise<void> {
    await this.handleWebhook('stripe', payload, signature);
  }

  async handlePayPalWebhook(payload: any, signature: string): Promise<void> {
    await this.handleWebhook('paypal', payload, signature);
  }

  private async handleWebhook(gatewayName: string, payload: any, signature: string): Promise<void> {
    this.logger.log(`Processing ${gatewayName} webhook`);

    try {
      const gateway = this.gatewayFactory.getByName(gatewayName);
      const event = await gateway.verifyWebhook(payload, signature);
      const payloadHash = this.hashPayload(payload);

      const webhookEvent = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(WebhookEventEntity);
        const existing = await repository.findOne({
          where: { gateway: gatewayName, eventId: event.id },
        });

        if (existing) {
          await this.createAuditLog({
            entityType: 'webhook',
            entityId: existing.id,
            action: AuditAction.WEBHOOK_DEDUPED,
            changes: { gateway: gatewayName, eventId: event.id, eventType: event.type },
          });
          return existing;
        }

        const created = repository.create({
          gateway: gatewayName,
          eventId: event.id,
          eventType: event.type,
          gatewayPaymentId: event.paymentIntentId,
          payloadHash,
          payload: event.data,
          status: WebhookEventStatus.RECEIVED,
          receivedAt: new Date(),
        });

        const saved = await repository.save(created);

        await this.createAuditLog({
          entityType: 'webhook',
          entityId: saved.id,
          action: AuditAction.WEBHOOK_RECEIVED,
          changes: { gateway: gatewayName, eventId: event.id, eventType: event.type },
        });

        return saved;
      });

      if (webhookEvent.status === WebhookEventStatus.PROCESSED) {
        return;
      }

      await this.processWebhookEvent(gatewayName, event.type, event.paymentIntentId, event.data, event.id);

      webhookEvent.status = WebhookEventStatus.PROCESSED;
      webhookEvent.processedAt = new Date();
      webhookEvent.lastError = null;
      await this.webhookEventRepository.save(webhookEvent);

      await this.createAuditLog({
        entityType: 'webhook',
        entityId: webhookEvent.id,
        action: AuditAction.WEBHOOK_PROCESSED,
        changes: { gateway: gatewayName, eventId: event.id, eventType: event.type },
      });
    } catch (error) {
      this.logger.error(`Failed to process ${gatewayName} webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Webhook verification failed');
    }
  }

  private async processWebhookEvent(
    gatewayName: string,
    eventType: string,
    gatewayPaymentId: string | undefined,
    data: Record<string, any>,
    eventId: string,
  ): Promise<void> {
    if (!gatewayPaymentId) {
      return;
    }

    switch (eventType) {
      case 'payment_intent.succeeded':
      case 'checkout.order.approved':
        await this.paymentService.confirmPaymentByGatewayId(gatewayPaymentId, `webhook:${gatewayName}:${eventId}`);
        return;

      case 'payment_intent.payment_failed':
      case 'checkout.order.failed':
        await this.paymentService.markPaymentFailedByGatewayId(
          gatewayPaymentId,
          data['last_payment_error']?.message || 'Payment failed according to webhook event',
        );
        return;

      case 'charge.refunded':
      case 'payment.refunded':
        await this.paymentService.refreshRefundedStatusByGatewayId(gatewayPaymentId);
        return;

      default:
        this.logger.log(`Unhandled ${gatewayName} webhook event type: ${eventType}`);
    }
  }

  private hashPayload(payload: any): string {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHash('sha256').update(body).digest('hex');
  }

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
