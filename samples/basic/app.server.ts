import { DolphFactory } from '../../common/core';
import { routes } from './index.routes';

const dolph = new DolphFactory(routes);
dolph.start();
