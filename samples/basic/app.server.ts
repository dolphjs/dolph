import helmet from 'helmet';
import { DolphFactory, GlobalInjector, middlewareRegistry } from '../../core';
import { SocketService } from '../../packages';
import { EventEmitterService } from '../../packages/events/events_module.packages';
import { AppComponent } from './app.component';
// import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
import { EventsComponent } from './socket.component';
// import { NewController } from './new.controller';
// import { mysql } from './sqlDb';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

middlewareRegistry.register(helmet());

const dolph = new DolphFactory([AppComponent], {
  options: { cors: { origin: '*' } },
  socketService: SocketService,
  component: new EventsComponent(),
});

dolph.start();
