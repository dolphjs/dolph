import helmet from 'helmet';
import { DolphFactory, GlobalInjector, middlewareRegistry, MVCAdapter } from '../../core';
import { SocketService } from '../../packages';
import { EventEmitterService } from '../../packages/events/events_module.packages';
import { AppComponent } from './app.component';
// import { autoInitMySql } from '../../packages';
import { routes } from './index.routes';
import { EventsComponent } from './socket.component';
import path from 'node:path';
// import { NewController } from './new.controller';
// import { mysql } from './sqlDb';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

middlewareRegistry.register(helmet());

MVCAdapter.setViewEngine('ejs');
MVCAdapter.setStaticAssets(path.join(__dirname, 'public'));

// For Handlebars
// MVCAdapter.setViewsDir(path.join(__dirname, 'views', 'layouts', 'main'));

MVCAdapter.setViewsDir(path.join(__dirname, 'views'));

const dolph = new DolphFactory([AppComponent], {
  options: { cors: { origin: '*' } },
  socketService: SocketService,
  component: new EventsComponent(),
});

dolph.start();
