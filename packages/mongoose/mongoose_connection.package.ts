import { MongooseConfig } from '../../common';
import mongoose from 'mongoose';
import { logger } from '../../utilities';
import clc from 'cli-color';

/**
 *
 * Used to initialize mongodb with mogoose ORM
 * @returns the mogoose promise
 *
 * @version 1.0.0
 */
const initMongo = (config: MongooseConfig): Promise<typeof mongoose> => {
    mongoose.set('strictQuery', false);
    return mongoose.connect(config.url, config.options);
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
            logger.error(clc.red(err));
        });
};

export { initMongo, autoInitMongo };
