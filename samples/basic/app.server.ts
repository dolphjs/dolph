import { DolphFactory } from '../../core';
// import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
import { NewController } from './new.controller';
// import { mysql } from './sqlDb';

const dolph = new DolphFactory([NewController]);
// autoInitMySql(mysql);

dolph.start();
