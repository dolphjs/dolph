import { logger } from '@dolphjs/utilities';
import clc from 'cli-color';
import { Sequelize } from 'sequelize';

/**
 *
 * Used to initialize mysql with sequelize ORM
 * @returns the mogoose promise
 *
 * @version 1.0.0
 */
const initMySql = (name: string, user: string, password: string, host: string) => {
  const sequelize = new Sequelize(name, user, password, {
    dialect: 'mysql',
    host: host || 'localhost',
  });
  // DolphSequelize = sequelize;
  return sequelize;
};

/**
 *
 * Used to intiialize mysql with sequelize ORM
 *
 * It accepts the return value from the `initSquelize` function  and calls the `sync` function on it
 *
 * @version 1.0.0
 */
const autoInitMySql = (sequelize: Sequelize) => {
  sequelize
    .sync()
    .then((_res) => {
      logger.info(clc.blueBright('MYSQL CONNECTED'));
    })
    .catch((err: any) => {
      logger.error(err);
    });
};

export { initMySql, autoInitMySql };
