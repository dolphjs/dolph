import Dolph from '@dolphjs/core';
import { routes } from './index.routes';

const dolph = new Dolph(routes, 8080, 'development', null, []);
dolph.enableCors({ origin: '*' });
dolph.listen();
