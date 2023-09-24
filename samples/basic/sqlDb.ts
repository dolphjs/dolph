import { initMySql } from '../../packages';

const mysql = initMySql('dolph', 'root', 'password', 'localhost');

export { mysql };
