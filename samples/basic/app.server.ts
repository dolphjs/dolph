import helmet from 'helmet';
import { DolphFactory, GlobalInjector } from '../../core';
import { EventEmitterService } from '../../packages/events/events_module.packages';
import { AppComponent } from './app.component';
import { EventsComponent } from './socket.component';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

const dolph = new DolphFactory([AppComponent], {
    middlewares: [helmet()],
    sockets: {
        // Open on purpose so the sample runs without tokens. Use socketJwtAuth(secret) in a real app.
        auth: false,
        options: { cors: { origin: '*' } },
        component: new EventsComponent(),
    },
});

dolph.start();
