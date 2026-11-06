import { MongooseConfig } from '../../common';
import type { Mongoose } from 'mongoose';
import { logger } from '../../utilities';
import clc from 'cli-color';
import { loadOptionalDriver } from '../../utilities/load_optional_driver.utilities';

// Apps install this themselves, and only load it if they use it.
const loadMongoose = () => loadOptionalDriver<Mongoose>('mongoose', () => require('mongoose'));

/**
 *
 * Used to Initialise mongodb with mogoose ORM
 * @returns the mogoose promise
 *
 * @version 1.0.0
 */
const initMongo = (config: MongooseConfig): Promise<Mongoose> => {
    const mongoose = loadMongoose();
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
        .then(() => {
            logger.info(clc.blueBright('MONGODB CONNECTED'));
        })
        .catch((err) => {
            logger.error(clc.red(err));
        });
};

export { initMongo, autoInitMongo };
