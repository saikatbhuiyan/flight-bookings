import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';

export const rabbitmqConfig: RabbitMQConfig = {
    uri: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
    exchanges: [
        {
            name: 'payment.events',
            type: 'topic',
        },
        {
            name: 'booking.events',
            type: 'topic',
        },
    ],
    channels: {
        'channel-1': {
            prefetchCount: 10,
            default: true,
        },
    },
    enableControllerDiscovery: true,
};
