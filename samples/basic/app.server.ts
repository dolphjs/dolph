import { DolphFactory } from '../../common/core';
import { autoInitMySql } from '../../common/packages';
import { routes } from './index.routes';

const dolph = new DolphFactory(routes);
autoInitMySql('dolph', 'root', 'Uduak15abasi%', 'http://localhost:3306');
dolph.start();
