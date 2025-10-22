import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { MessageBrokerModule } from '@app/message-broker';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MessageBrokerModule.forRoot(),
  ],
  providers: [NotificationService],
})
export class NotificationModule {}
