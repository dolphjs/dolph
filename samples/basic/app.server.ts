import { DolphFactory, GlobalInjector } from '../../core';
import { SocketService } from '../../packages';
import { EventEmitterService } from '../../packages/events/events_module.packages';
import { AppComponent } from './app.component';
// import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
import { EventsComponent } from './socket.component';
// import { NewController } from './new.controller';
// import { mysql } from './sqlDb';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

const dolph = new DolphFactory([AppComponent], {
  options: { cors: { origin: '*' } },
  socketService: SocketService,
  component: new EventsComponent(),
});

// autoInitMySql(mysql);

dolph.start();
