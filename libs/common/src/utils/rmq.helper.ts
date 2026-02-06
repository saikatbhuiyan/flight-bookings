import { RmqContext } from '@nestjs/microservices';
import { Logger, HttpException } from '@nestjs/common';

const logger = new Logger('RmqHelper');

export class RmqHelper {
  static handleAck(
    context: RmqContext,
    callback: () => Promise<any>,
    maxRetries = 3,
  ) {
    if (!context || typeof context.getChannelRef !== 'function') {
      return callback();
    }

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const headers = originalMsg.properties.headers;
    const retryCount = (headers['x-death']?.[0]?.count || 0) as number;

    return callback()
      .then((result) => {
        channel.ack(originalMsg);
        return result;
      })
      .catch((error) => {
        console.log('error', error);
        const isClientError =
          error instanceof HttpException &&
          error.getStatus() >= 400 &&
          error.getStatus() < 500;

        if (isClientError) {
          logger.debug(
            `Ack-ing client error: ${error.message} (${error.getStatus()})`,
          );
          channel.ack(originalMsg);
          throw error;
        }

        if (retryCount >= maxRetries) {
          logger.error(
            `❌ Message failed after ${maxRetries} retries. Moving to DLQ.`,
          );
          channel.ack(originalMsg); // remove from main queue
        } else {
          logger.warn(
            `⚠️ Message failed (retry #${retryCount + 1}). Sending to retry queue.`,
          );
          channel.nack(originalMsg, false, false);
        }
        throw error;
      });
  }
}
