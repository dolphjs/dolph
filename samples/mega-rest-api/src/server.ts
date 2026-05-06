import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { GlobalInjector, DolphFactory, middlewareRegistry } from '../../../core';
import { EventEmitterService } from '../../../packages/events/events_module.packages';
import { SocketService } from '../../../packages';
import { AuthComponent } from './components/auth/auth.component';
import { UserComponent } from './components/users/user.component';
import { FileComponent } from './components/files/file.component';
import { AdminComponent } from './components/admin/admin.component';
import { HealthComponent } from './components/health/health.component';
import { PublicRoutes } from './routes/public.routes';
import { RealtimeComponent } from './sockets/realtime.component';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

middlewareRegistry.registerMany([helmet(), cookieParser(), morgan('dev')]);

const dolph = new DolphFactory(
    [HealthComponent, AuthComponent, UserComponent, FileComponent, AdminComponent, new PublicRoutes()],
    {
        options: { cors: { origin: '*' } },
        socketService: SocketService,
        component: new RealtimeComponent(),
    },
);

dolph.start();
