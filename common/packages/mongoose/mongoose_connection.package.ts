import Dolph from '@dolphjs/core/lib/Dolph';
import { MongooseConfig } from '../../interfaces/mongoose.interface';
import { logger } from '../../utilities/logger.utilities';
import clc from 'cli-color';

/**
 *
 * Used to initialize mongodb with mogoose ORM
 * @returns the mogoose promise
 *
 * @version 1.0.0
 */
const initMongo = (config: MongooseConfig): Promise<typeof Dolph.mongoose> => {
  Dolph.mongoose.set('strictQuery', false);
  return Dolph.mongoose.connect(config.url, config.options);
};

/**
 *
 * Used to intiialize mongodb with mongoose ORM
 *
 * Unlike the `initMongo` function, it handles the promise
 *
 * @version 1.0.0
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
