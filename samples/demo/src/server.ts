import { DolphFactory } from '@dolphjs/dolph';
import { UserComponent } from './components/user/user.component';

const dolph = new DolphFactory([UserComponent]);
dolph.start();
