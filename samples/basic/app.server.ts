import { DolphFactory } from '../../core';
import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
import { mysql } from './sqlDb';

const dolph = new DolphFactory(routes);
autoInitMySql(mysql);

dolph.start();
