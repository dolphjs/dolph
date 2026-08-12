import { logger } from '../../utilities';
import clc from 'cli-color';
import { DataSource } from 'typeorm';
import { TypeOrmConfig } from '../../common';

let DolphDataSource: DataSource | null = null;

/**
 * Used to Initialise TypeORM
 * @returns the DataSource instance
 *
 * @version 2.0.0
 */
const initTypeOrm = (config: TypeOrmConfig): DataSource => {
    DolphDataSource = new DataSource(config.options);
    return DolphDataSource;
};

/**
 * Used to initialise TypeORM and connect to the database
 *
 * @version 2.0.0
 */
const autoInitTypeOrm = (config: TypeOrmConfig) => {
    const dataSource = initTypeOrm(config);
    dataSource
        .initialize()
        .then(() => {
            logger.info(clc.blueBright('TYPEORM CONNECTED'));
        })
        .catch((err: any) => {
            logger.error(clc.red(err));
        });
};

/**
 * Retrieve the global TypeORM DataSource instance
 * @returns {DataSource}
 */
const getDataSource = (): DataSource => {
    if (!DolphDataSource) {
        throw new Error('TypeORM DataSource has not been initialized. Ensure autoInitTypeOrm is called or typeorm config is provided.');
    }
    return DolphDataSource;
};

export { initTypeOrm, autoInitTypeOrm, getDataSource, DolphDataSource };
