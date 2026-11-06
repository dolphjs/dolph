import { createServer, Server } from 'http';
import express, { Express, Router } from 'express';
import type { DRequest } from '../../common';
import { AdapterErrorHandler, AdapterHandler, HttpAdapter, HttpMethod, ViewOptions } from './http_adapter';

export class ExpressAdapter implements HttpAdapter {
    readonly name = 'express';
    readonly server: Server;

    private readonly app: Express = express();

    // GraphQL is mounted after routes because it has to start first. Mounting these
    // routers ahead of the routes keeps anything added late running before them.
    private readonly securityMiddlewares = Router();
    private readonly middlewares = Router();
    private readonly routes = Router();
    private routesMounted = false;

    constructor() {
        this.app.disable('x-powered-by');
        this.app.use(this.securityMiddlewares);
        this.server = createServer(this.app);
    }

    useSecurity(middleware: AdapterHandler) {
        this.securityMiddlewares.use(middleware);
    }

    useBodyParsers({ jsonLimit }: { jsonLimit: string }) {
        this.app.use(
            express.json({
                limit: jsonLimit,
                // Stashes the raw bytes on req.rawBody before they're parsed —
                // needed for byte-exact HMAC webhook signature verification,
                // which JSON.stringify(req.body) can't reliably reproduce.
                verify: (req, _res, buf) => {
                    (req as unknown as DRequest).rawBody = buf;
                },
            }),
        );
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(this.middlewares);
    }

    use(middleware: AdapterHandler) {
        this.middlewares.use(middleware);
    }

    useViews({ engine, assetsPath, viewsDir }: ViewOptions) {
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(assetsPath));
        this.app.set('view engine', engine);

        if (engine === 'handlebars') {
            // Loaded here so apps not using handlebars never pay to import it.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { engine: handlebars } = require('express-handlebars') as typeof import('express-handlebars');

            this.app.engine('handlebars', handlebars({ defaultLayout: false }));
        }

        this.app.set('views', viewsDir);
    }

    mountRouter(path: string, router: Router) {
        this.app.use(path, router);
    }

    route(method: HttpMethod, path: string, handlers: AdapterHandler[]) {
        if (!this.routesMounted) {
            this.app.use(this.routes);
            this.routesMounted = true;
        }

        this.routes[method](path, ...handlers);
    }

    useErrorHandlers(handlers: AdapterErrorHandler[]) {
        handlers.forEach((handler) => this.app.use(handler));
    }

    useNotFound(handler: AdapterHandler) {
        this.app.use('/', handler);
    }

    requestListener() {
        return this.app;
    }

    listen(port: number, host: string) {
        return new Promise<void>((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(port, host, () => {
                this.server.off('error', reject);
                resolve();
            });
        });
    }

    close() {
        return new Promise<void>((resolve, reject) => {
            if (!this.server.listening) {
                resolve();
                return;
            }

            this.server.close((error) => (error ? reject(error) : resolve()));
        });
    }
}
