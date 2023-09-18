import { DolphFactory } from '../../common/core';
import { autoInitMySql } from '../../common/packages';
import { routes } from './index.routes';
import { mysql } from './sqlDb';

const dolph = new DolphFactory(routes);
autoInitMySql(mysql);

dolph.start();
