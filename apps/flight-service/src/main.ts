import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlightServiceModule } from './flight-service.module';
import { CommonRpcExceptionFilter, RmqSetup } from '@app/common';

async function bootstrap() {
  const logger = new Logger('FlightService');
  const app = await NestFactory.create(FlightServiceModule);
  const configService = app.get(ConfigService);
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  const queue = 'flight_queue';

  // Automatically create queues for this service
  await RmqSetup.setupQueues(configService, 'auth', 10000, 1);

  // Global prefix for HTTP routes
  app.setGlobalPrefix('api/v1');

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

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flight Service')
    .setDescription('Internal API for Flight Service')
    .setVersion('1.0')
    .addTag('Health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.startAllMicroservices();
  logger.log(`Flight Service is running and listening to queue: ${queue}`);

  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);
  logger.log(`Flight Service HTTP server is running on port: ${port}`);
}

bootstrap();
