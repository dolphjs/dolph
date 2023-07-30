import Dolph from '@dolphjs/core/lib/Dolph';
import { MongooseConfig } from '../../interfaces/mongoose.interface';
import { logger } from '../../utilities/logger.utilities';
import clc from 'cli-color';

/**
 *
 * Used to initialize mongodb with mogoose ORM
 * @returns the mogoose promise
 */
const initMongo = (config: MongooseConfig): Promise<typeof Dolph.mongoose> => {
  Dolph.mongoose.set('strictQuery', false);
  return Dolph.mongoose.connect(config.url, config.options);
};

/**
 *
 * Used to intiialize mongodb with mongoose ORM but the difference between it and `initMongo` is that it handles the promises on it's own
 */
const autoInitMongo = (config: MongooseConfig): void => {
  initMongo(config)
    .then((_res) => {
      logger.info(clc.blueBright('MONGODB CONNECTED'));
    })
    .catch((err) => {
      logger.error(err);
    });
};

export { initMongo, autoInitMongo };
