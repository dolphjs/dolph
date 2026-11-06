import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { GlobalInjector, DolphFactory } from '../../../core';
import { EventEmitterService } from '../../../packages/events/events_module.packages';
import { AuthComponent } from './components/auth/auth.component';
import { UserComponent } from './components/users/user.component';
import { FileComponent } from './components/files/file.component';
import { AdminComponent } from './components/admin/admin.component';
import { HealthComponent } from './components/health/health.component';
import { PublicRoutes } from './routes/public.routes';
import { RealtimeComponent } from './sockets/realtime.component';

new GlobalInjector([{ service: EventEmitterService.name, value: new EventEmitterService() }]);

const dolph = new DolphFactory(
    [HealthComponent, AuthComponent, UserComponent, FileComponent, AdminComponent, new PublicRoutes()],
    {
        middlewares: [helmet(), cookieParser(), morgan('dev')],
        sockets: {
            // Open on purpose so the sample runs without tokens. Use socketJwtAuth(secret) in a real app.
            auth: false,
            options: { cors: { origin: '*' } },
            component: new RealtimeComponent(),
        },
    },
);

dolph.start();
