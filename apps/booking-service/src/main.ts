import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingServiceModule } from './booking-service.module';
import { CommonRpcExceptionFilter } from '@app/common';
import { initializeTracing } from '@app/telemetry';


async function bootstrap() {
  const logger = new Logger('BookingService');
  const app = await NestFactory.create(BookingServiceModule);
  const configService = app.get(ConfigService);

  initializeTracing('booking-service');

  // Global prefix for HTTP routes
  app.setGlobalPrefix('api/v1');

  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  const queue = 'booking_queue';

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
    .setTitle('Booking Service')
    .setDescription('Internal API for Booking Service')
    .setVersion('1.0')
    .addTag('Health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.startAllMicroservices();
  logger.log(`Booking Service is running and listening to queue: ${queue}`);

  const port = configService.get<number>('PORT') || 3003;
  await app.listen(port);
  logger.log(`Booking Service HTTP server is running on port: ${port}`);
}

bootstrap();
