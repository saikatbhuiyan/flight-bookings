import { NestFactory } from '@nestjs/core';
import { FlightServiceModule } from './flight-service.module';

async function bootstrap() {
  const app = await NestFactory.create(FlightServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
