import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlightModule } from './flight.module';

async function bootstrap() {
  const logger = new Logger('FlightService');
  const app = await NestFactory.create(FlightModule);
  const configService = app.get(ConfigService);

  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  const queue = 'flight_queue';

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

  await app.startAllMicroservices();
  logger.log(`Flight Service is running and listening to queue: ${queue}`);

  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);
  logger.log(`Flight Service HTTP server is running on port: ${port}`);
}

bootstrap();
