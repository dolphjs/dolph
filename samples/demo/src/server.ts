import { DolphFactory } from '../../../../core';
import { UserComponent } from './components/user/user.component';

const dolph = new DolphFactory([UserComponent]);
dolph.start();
