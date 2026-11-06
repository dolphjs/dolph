import clc from 'cli-color';
import { DolphConfigDbOption, MongooseConfig, TypeOrmConfig } from '../common';
import { initMongo, initTypeOrm } from '../packages';
import { inAppLogger, logger } from '../utilities';
import { configs } from './config.core';

export type DatabaseCloser = () => Promise<unknown>;

const connectMongo = async (config: MongooseConfig): Promise<DatabaseCloser> => {
    const url = config.url === 'sensitive' ? configs.MONGO_URL : config.url;

    if (!url) {
        throw new Error('`url` is set to sensitive, but `MONGO_URL` is missing from the environment');
    }

    const mongoose = await initMongo({ ...config, url });
    logger.info(clc.blueBright('MONGODB CONNECTED'));

    return () => mongoose.disconnect();
};

const SENSITIVE_TYPEORM_OPTIONS = {
    url: 'SQL_URL',
    username: 'SQL_USER',
    password: 'SQL_PASSWORD',
    host: 'SQL_HOST',
} as const;

const connectTypeOrm = async (config: TypeOrmConfig): Promise<DatabaseCloser> => {
    // TypeORM's options are a union by driver, and not all of them have these keys.
    const options = { ...config.options } as TypeOrmConfig['options'] & Record<string, unknown>;

    Object.entries(SENSITIVE_TYPEORM_OPTIONS).forEach(([option, variable]) => {
        if (options[option] === 'sensitive') (options as Record<string, unknown>)[option] = configs[variable];
    });

    const dataSource = await initTypeOrm({ ...config, options }).initialize();
    logger.info(clc.blueBright('TYPEORM CONNECTED'));

    return () => dataSource.destroy();
};

/**
 * Connects every database in `dolph_config.yaml`, one at a time, and returns what closes them.
 * A failure rejects unless that database sets `required: false`, so an app never takes
 * traffic with a database it needs missing.
 */
export const connectDatabases = async (database?: DolphConfigDbOption | null): Promise<DatabaseCloser[]> => {
    const closers: DatabaseCloser[] = [];

    const connect = async (name: string, required: boolean | undefined, open: () => Promise<DatabaseCloser>) => {
        try {
            closers.push(await open());
        } catch (error) {
            if (required === false) {
                inAppLogger.warn(clc.yellow(`Continuing without ${name}, which is not required: ${error.message}`));
                return;
            }

            await Promise.allSettled(closers.map((close) => close()));
            throw new Error(`Could not connect to ${name}: ${error.message}`, { cause: error });
        }
    };

    if (database?.mongo?.url) {
        await connect('MongoDB', database.mongo.required, () => connectMongo(database.mongo));
    }

    if (database?.typeorm?.options) {
        await connect('TypeORM', database.typeorm.required, () => connectTypeOrm(database.typeorm));
    }

    return closers;
};
