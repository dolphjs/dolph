import { logger } from '../../utilities';
import clc from 'cli-color';
import type { Sequelize } from 'sequelize';
import { SqlConfig } from '../../common';

// Loaded on first use so apps that don't use this driver never pay to import it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadSequelize = (): typeof import('sequelize') => require('sequelize');

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
