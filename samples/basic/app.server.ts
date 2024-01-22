import { DolphFactory } from '../../core';
import { AppComponent } from './app.component';
// import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
// import { NewController } from './new.controller';
// import { mysql } from './sqlDb';

const dolph = new DolphFactory([AppComponent]);
// autoInitMySql(mysql);

dolph.start();
