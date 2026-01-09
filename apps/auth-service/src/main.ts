import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthServiceModule } from './auth-service.module';
import { RmqSetup } from '@app/common';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AuthServiceModule);
  const configService = app.get(ConfigService);
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  const queue = 'auth_queue';

  // Automatically create queues for this service
  await RmqSetup.setupQueues(configService, 'auth', 10000, 3);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: queue,
      queueOptions: { durable: true },
      prefetchCount: 1,
      noAck: false, // manual ack pattern
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.startAllMicroservices();
  logger.log(`Auth Service is running and listening to queue: ${queue}`);

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`Auth Service HTTP server is running on port: ${port}`);
}

bootstrap();
