import { transports, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { createLogFormat } from './log-format';

const isDev = process.env.NODE_ENV !== 'production';

const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

export const winstonLoggerConfig = {
  level: logLevel,

  format: createLogFormat(isDev),

  transports: isDev
    ? [
        new transports.Console({
          level: logLevel,

          format: format.combine(
            format.colorize(),

            format.timestamp(),

            format.printf(({ timestamp, level, message, ...meta }) => {
              const metaString =
                Object.keys(meta).length > 0
                  ? ` | ${JSON.stringify(meta)}`
                  : '';

              return `[${String(timestamp)}] ${level}: ${String(message)}${metaString}`;
            }),
          ),
        }),
      ]
    : [
        new transports.Console({
          level: logLevel,

          format: format.combine(
            format.timestamp(),

            format.json(),
          ),
        }),

        new DailyRotateFile({
          filename: 'logs/%DATE%-app.log',

          datePattern: 'YYYY-MM-DD',

          zippedArchive: true,

          maxSize: '20m',

          maxFiles: '30d',

          level: logLevel,

          format: format.combine(
            format.timestamp(),

            format.json(),
          ),
        }),
      ],
};
