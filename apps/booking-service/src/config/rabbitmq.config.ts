import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';

export const rabbitmqConfig: RabbitMQConfig = {
    uri: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
    exchanges: [
        {
            name: 'booking.events',
            type: 'topic',
            options: { durable: true },
        },
        {
            name: 'booking.dlq',
            type: 'topic',
            options: { durable: true },
        },
    ],
    channels: {
        'channel-1': {
            prefetchCount: 10,
            default: true,
        },
    },
    queues: [
        {
            name: 'booking-service.events',
            exchange: 'booking.events',
            routingKey: 'booking.*',
            options: {
                durable: true,
            },
        },
    ],
};
