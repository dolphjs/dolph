import clc from 'cli-color';
import { logger } from '../../utilities/logger.utilities';
import { Sequelize } from 'sequelize';

const initMySql = (name: string, user: string, password: string, host: string) => {
  const sequelize = new Sequelize(name, user, password, {
    dialect: 'mysql',
    host: host || 'localhost',
  });
  return sequelize;
};

const autoInitMySql = (name: string, user: string, password: string, host: string) => {
  initMySql(name, user, password, host)
    .sync()
    .then((_res) => {
      logger.info(clc.blueBright('MYSQL CONNECTED'));
    })
    .catch((err: any) => {
      logger.error(err);
    });
};

export { initMySql, autoInitMySql };
