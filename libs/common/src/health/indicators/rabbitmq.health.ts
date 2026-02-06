import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let connection;
    try {
      const url = this.configService.get<string>('RABBITMQ_URL');
      connection = await connect(url);
      const result = this.getStatus(key, true);
      await connection.close();
      return result;
    } catch (error) {
      if (connection) {
        await connection.close();
      }
      throw new HealthCheckError(
        'RabbitMQ check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
