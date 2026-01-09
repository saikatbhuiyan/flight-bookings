import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { HealthModule } from '@app/common';
import { NotificationService } from './notification-service.service';
import { MessageBrokerModule } from '@app/message-broker';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([]),
    MessageBrokerModule.forRoot(),
    HealthModule,
  ],
  providers: [NotificationService],
})
export class NotificationModule { }
