import { DolphFactory } from '../../common/core';
import { routes } from './index.routes';
import { autoInitMongo } from '../../common/packages';
import { logger } from '../../common/utilities/logger.utilities';

const dolph = new DolphFactory(routes);
dolph.enableCors();

autoInitMongo({ url: 'mongodb://127.0.0.1:27017/dolphjs' });

logger.info('This is an info message');
logger.warn('This is a warning message');
logger.debug('This is a debug message');
logger.error('This is an error message');

dolph.start();
