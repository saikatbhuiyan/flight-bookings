import { format } from 'winston';
import type { TransformableInfo } from 'logform';

const { combine, timestamp, errors, printf, colorize, splat, json } = format;

export const createLogFormat = (isDev: boolean) =>
  isDev
    ? combine(
        colorize({ all: true }),

        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

        errors({ stack: true }),

        splat(),

        printf((info: TransformableInfo) => {
          const { timestamp, level, message, stack, ...meta } = info;
          const metaStr =
            Object.keys(meta).length > 0
              ? ` | meta: ${JSON.stringify(meta)}`
              : '';

          const stackStr =
            stack && typeof stack === 'string' ? ` | stack: ${stack}` : '';

          return `${String(timestamp)} ${level}: ${String(message)}${stackStr}${metaStr}`;
        }),
      )
    : combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

        errors({ stack: true }),

        splat(),

        json(),
      );
