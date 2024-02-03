import { DRequest, DResponse } from '../common';
import morgan from 'morgan';
import { configs } from './config.core';
import { logger } from '../utilities';
import clc from 'cli-color';

morgan.token('message', (req: DRequest, res: DResponse) => res.locals.errorMessage || '');

const getIpFormat = () => (configs.NODE_ENV !== 'test' ? ':remote-addr - ' : '');
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

export const successHandler = morgan(successResponseFormat, {
  skip: (req: DRequest, res: DResponse) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(clc.blackBright(message.trim())) },
});

export const morganErrorHandler = morgan(errorResponseFormat, {
  skip: (req: DRequest, res: DResponse) => res.statusCode < 400,
  stream: { write: (message) => logger.error(clc.redBright(message.trim())) },
});
