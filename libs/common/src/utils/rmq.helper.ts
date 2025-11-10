import { RmqContext } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

const logger = new Logger('RmqHelper');

export class RmqHelper {
  static handleAck(
    context: RmqContext,
    callback: () => Promise<any>,
    maxRetries = 3,
  ) {
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
        if (retryCount >= maxRetries) {
          logger.error(
            `❌ Message failed after ${maxRetries} retries. Moving to DLQ.`,
          );
          channel.ack(originalMsg); // remove from main queue
          // no requeue => goes to dead-letter queue
        } else {
          logger.warn(
            `⚠️ Message failed (retry #${retryCount + 1}). Sending to retry queue.`,
          );
          channel.nack(originalMsg, false, false); // nack => send to retry queue
        }
        throw error;
      });
  }
}
