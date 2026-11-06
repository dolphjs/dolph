import { MongooseConfig } from '../../common';
import type { Mongoose } from 'mongoose';
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

export { initMongo };
