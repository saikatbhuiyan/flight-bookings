import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from '../entities/outbox-event.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { Cron, CronExpression } from '@nestjs/schedule';
import { trace, context as otelContext, SpanStatusCode, propagation } from '@opentelemetry/api';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class OutboxService {
    private readonly logger = new Logger(OutboxService.name);
    private readonly tracer = trace.getTracer('booking-service');

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly outboxRepository: Repository<OutboxEvent>,
        private readonly eventEmitter: EventEmitter2,
        private readonly amqpConnection: AmqpConnection,
    ) { }

    async storeEvent(
        aggregateType: string,
        aggregateId: string,
        eventType: string,
        payload: Record<string, any>,
        transactionManager?: any,
    ): Promise<OutboxEvent> {
        const repository = transactionManager
            ? transactionManager.getRepository(OutboxEvent)
            : this.outboxRepository;

        const currentSpan = trace.getActiveSpan();
        const spanContext = currentSpan?.spanContext();

        const event = repository.create({
            eventId: uuidv4(),
            aggregateType,
            aggregateId,
            eventType,
            payload,
            status: OutboxEventStatus.PENDING,
            traceId: spanContext?.traceId,
            spanId: spanContext?.spanId,
        });

        return repository.save(event);
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async publishPendingEvents(): Promise<void> {
        const span = this.tracer.startSpan('outbox.publishPendingEvents');

        try {
            const pendingEvents = await this.outboxRepository.find({
                where: {
                    status: OutboxEventStatus.PENDING,
                },
                order: { createdAt: 'ASC' },
                take: 100,
            });

            if (pendingEvents.length === 0) {
                span.end();
                return;
            }

            this.logger.debug(`Publishing ${pendingEvents.length} pending events`);

            for (const event of pendingEvents) {
                await this.publishEvent(event);
            }

            span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
            this.logger.error('Error publishing pending events:', error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        } finally {
            span.end();
        }
    }

    private async publishEvent(event: OutboxEvent): Promise<void> {
        const span = this.tracer.startSpan('outbox.publishEvent', {
            attributes: {
                'event.id': event.eventId,
                'event.type': event.eventType,
                'event.aggregate_id': event.aggregateId,
                'trace.id': event.traceId,
            },
        });

        try {
            await this.outboxRepository.update(event.id, {
                status: OutboxEventStatus.PROCESSING,
            });

            // Publish to RabbitMQ with distributed tracing context
            await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
                await this.amqpConnection.publish(
                    'booking.events',
                    event.eventType,
                    {
                        ...event.payload,
                        _metadata: {
                            eventId: event.eventId,
                            traceId: event.traceId,
                            spanId: event.spanId,
                            timestamp: new Date().toISOString(),
                        },
                    },
                    {
                        persistent: true,
                        headers: {
                            'x-trace-id': event.traceId,
                            'x-span-id': event.spanId,
                        },
                    },
                );
            });

            await this.outboxRepository.update(event.id, {
                status: OutboxEventStatus.PUBLISHED,
                publishedAt: new Date(),
            });

            this.logger.debug(`Published event ${event.eventId} (${event.eventType})`);
            span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
            this.logger.error(`Failed to publish event ${event.eventId}:`, error);

            const newRetryCount = event.retryCount + 1;

            await this.outboxRepository.update(event.id, {
                status: OutboxEventStatus.PENDING,
                retryCount: newRetryCount,
                lastError: error.message,
            });

            // Move to DLQ if max retries exceeded
            if (newRetryCount >= event.maxRetries) {
                await this.moveToDeadLetterQueue(event, error);
            }

            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        } finally {
            span.end();
        }
    }

    private async moveToDeadLetterQueue(event: OutboxEvent, error: Error): Promise<void> {
        await this.outboxRepository.update(event.id, {
            status: OutboxEventStatus.FAILED,
            lastError: `Max retries exceeded: ${error.message}`,
        });

        // Publish to DLQ exchange
        try {
            await this.amqpConnection.publish(
                'booking.dlq',
                event.eventType,
                {
                    ...event.payload,
                    _dlq_metadata: {
                        originalEventId: event.eventId,
                        failureReason: error.message,
                        retryCount: event.retryCount,
                        failedAt: new Date().toISOString(),
                    },
                },
                { persistent: true },
            );
        } catch (dlqError) {
            this.logger.error('Failed to publish to DLQ:', dlqError);
        }

        this.logger.error(`Event ${event.eventId} moved to DLQ after ${event.retryCount} retries`);
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldEvents(): Promise<void> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result = await this.outboxRepository.delete({
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: LessThan(sevenDaysAgo),
        });

        if (result.affected > 0) {
            this.logger.log(`Cleaned up ${result.affected} old outbox events`);
        }
    }
}
