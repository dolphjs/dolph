import winston from 'winston';
import clc from 'cli-color';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  levels: {
    info: 0,
    warn: 1,
    debug: 2,
    error: 3,
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const { timestamp, level, message, stack } = info;
      const formattedTimestamp = clc.cyanBright(new Date(timestamp).toUTCString());
      let formattedLevel: string;

      if (level === 'info') {
        formattedLevel = clc.blue(`[${level.toUpperCase()}]`);
      } else if (level === 'warn') {
        formattedLevel = clc.yellow(`[${level.toUpperCase()}]`);
      } else if (level === 'debug') {
        formattedLevel = clc.cyan(`[${level.toUpperCase()}]`);
      } else if (level === 'error') {
        formattedLevel = clc.red(`[${level.toUpperCase()}]`);
      }

      let logMessage = `${formattedLevel}: ${formattedTimestamp} ${message}`;

      if (stack) {
        logMessage += `\n${stack}`;
      }

      return logMessage;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      level: 'debug',
      filename: `logs/%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

export { logger };
