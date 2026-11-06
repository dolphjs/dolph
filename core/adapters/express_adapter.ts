import { createServer, Server } from 'http';
import express, { Express, Router } from 'express';
import type { DRequest } from '../../common';
import { AdapterErrorHandler, AdapterHandler, HttpAdapter, HttpMethod, ViewOptions } from './http_adapter';

export class ExpressAdapter implements HttpAdapter {
    readonly name = 'express';
    readonly server: Server;

    private readonly app: Express = express();

    // Routes are mounted in the constructor of DolphFactory, but enableHelmet(),
    // enableCors() and middlewares() can only be called after it. These routers are
    // mounted ahead of the routes so whatever those methods add still runs before them.
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

            this.app.engine('handlebars', handlebars({ defaultLayout: viewsDir }));
        } else if (engine === 'ejs' || engine === 'pug') {
            this.app.use('views', express.static(viewsDir));
        }
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

    listen(port: number, host: string, onListening: () => void) {
        this.server.listen(port, host, onListening);
    }
}
