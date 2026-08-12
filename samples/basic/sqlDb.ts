import { initSql } from '../../packages';

const mysql = initSql({
    dialect: 'mysql',
    database: 'dolph',
    user: 'root',
    pass: 'password',
    host: 'localhost',
});

export { mysql };
