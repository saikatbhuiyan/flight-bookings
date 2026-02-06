import { Controller, Get } from '@nestjs/common';
import { NotificationService } from './notification-service.service';

@Controller()
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getHello(): string {
    return this.notificationService.getHello();
  }
}
