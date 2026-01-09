import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  await app.listen(process.env.port ?? 3004);
}
bootstrap();
