import { logger } from '../../utilities';
import clc from 'cli-color';
import { loadOptionalDriver } from '../../utilities/load_optional_driver.utilities';
import type { Sequelize } from 'sequelize';
import { SqlConfig } from '../../common';

// Apps install this themselves, and only load it if they use it.
const loadSequelize = () => loadOptionalDriver<typeof import('sequelize')>('sequelize', () => require('sequelize'));

let DolphSequelize: Sequelize | null = null;

/**
 * Used to Initialise SQL with sequelize ORM
 * @returns the Sequelize instance
 *
 * @version 2.0.0
 */
const initSql = (config: SqlConfig): Sequelize => {
    const { Sequelize: SequelizeClient } = loadSequelize();
    DolphSequelize = new SequelizeClient(config.database, config.user || '', config.pass || '', {
        dialect: config.dialect as any,
        host: config.host || 'localhost',
        ...config.options,
    });
    return DolphSequelize;
};

/**
 * Used to initialise SQL with sequelize ORM and connect
 *
 * @version 2.0.0
 */
const autoInitSql = (config: SqlConfig) => {
    const sequelize = initSql(config);
    sequelize
        .sync()
        .then(() => {
            logger.info(clc.blueBright(`SEQUELIZE (${config.dialect.toUpperCase()}) CONNECTED`));
        })
        .catch((err: any) => {
            logger.error(clc.red(err));
        });
};

/**
 * Retrieve the global Sequelize instance
 * @returns {Sequelize}
 */
const getSequelize = (): Sequelize => {
    if (!DolphSequelize) {
        throw new Error('Sequelize has not been initialized. Ensure autoInitSql is called or sequelize config is provided.');
    }
    return DolphSequelize;
};

export { initSql, autoInitSql, getSequelize, DolphSequelize };
