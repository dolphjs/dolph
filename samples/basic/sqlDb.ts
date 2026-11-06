import { initSql } from '../../packages';

const mysql = initSql({
    // In-memory so the sample runs without a database server or extra driver.
    dialect: 'sqlite',
    database: 'dolph',
    options: { storage: ':memory:' },
});

export { mysql };
