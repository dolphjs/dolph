import winston from 'winston';
import clc from 'cli-color';
import DailyRotateFile from 'winston-daily-rotate-file';
import moment from 'moment';

const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const { timestamp, level, message, stack } = info;
      const formattedTimestamp = clc.white(moment(timestamp).format('YYYY-MM-DD HH:mm:ss'));
      let formattedLevel: string;

      let newMessage: string = message;

      if (level === 'info') {
        formattedLevel = clc.blue(`[${level.toUpperCase()}]`);
      } else if (level === 'warn') {
        formattedLevel = clc.yellow(`[${level.toUpperCase()}]`);
        newMessage = clc.yellowBright(message);
      } else if (level === 'debug') {
        formattedLevel = clc.green(`[${level.toUpperCase()}]`);
        newMessage = clc.greenBright(message);
      } else if (level === 'error') {
        formattedLevel = clc.red(`[${level.toUpperCase()}]`);
        newMessage = clc.redBright(message);
      }

      let logMessage = `${formattedLevel}: ${formattedTimestamp} ${newMessage}`;

      if (stack) {
        logMessage += `\n${stack}`;
      }

      return logMessage;
    }),
  ),
  /**
   * Todo: check if there's need to remove the logger file or fix the formatting issue as a result of clc
   */
  transports: [
    new winston.transports.Console({ level: 'debug' }),
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
