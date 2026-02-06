import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationServiceModule } from './notification-service.module';
import { CommonRpcExceptionFilter } from '@app/common';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  const app = await NestFactory.create(NotificationServiceModule);
  const configService = app.get(ConfigService);

  // Global prefix for HTTP routes
  app.setGlobalPrefix('api/v1');

  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  const queue = 'notification_queue';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
      noAck: false,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new CommonRpcExceptionFilter());

  await app.startAllMicroservices();
  logger.log(
    `Notification Service is running and listening to queue: ${queue}`,
  );

  const port = configService.get<number>('PORT') || 3004;
  await app.listen(port);
  logger.log(`Notification Service HTTP server is running on port: ${port}`);
}

bootstrap();
