import 'reflect-metadata';
import { Router } from 'express';
import { CorsOptions } from 'cors';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import clc from 'cli-color';
import {
    DNextFunc,
    DRequest,
    DResponse,
    DolphConfig,
    DolphConfigViews,
    DolphOptions,
    ErrorResponse,
    Middleware,
    dolphPort,
    ResponseInterceptor,
} from '../common';
import { inAppLogger, logger } from '../utilities';
import { SocketService } from '../packages';
import { DolphErrors, dolphMessages } from '../common/constants';
import cors from 'cors';
import { configLoader, configs } from './config.core';
import { connectDatabases, DatabaseCloser } from './database.core';
import helmet, { HelmetOptions } from 'helmet';
import { errorConverter, errorHandler } from './error.core';
import { Server } from 'http';
import { normalizePath } from '../utilities/normalize_path.utilities';
import { getControllersFromMetadata } from '../utilities/get_controllers_from_component';
import { getShieldMiddlewares, getUnShieldMiddlewares, resolveRouteShields } from '../utilities/spring_helpers.utilities';
import { GlobalInjection } from './initialisers';
import { join, resolve } from 'path';
import { createHttpAdapter } from './adapters/create_http_adapter';
import { AdapterHandler, HttpAdapter } from './adapters/http_adapter';
import { ROUTE_ARGS_METADATA, RouteParamMetadata, routeParamsArr } from '../decorators';
import httpStatus from 'http-status';
import { ClassConstructor } from 'class-transformer';
import { transformAndValidateDto } from './transformer';

const DEFAULT_PORT = 3030;
const GRAPHQL_PATH = '/graphql';
// Open requests get this long to finish, and shutdown as a whole gets a little longer.
const DRAIN_TIMEOUT_MS = 10_000;
const EXIT_TIMEOUT_MS = 15_000;

type DolphComponents = Array<{ new (): any } | { path?: string; router: Router }>;

type ExpressHttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

const isExpressHttpMethod = (value: unknown): value is ExpressHttpMethod =>
    typeof value === 'string' && ['get', 'post', 'patch', 'put', 'delete'].includes(value);

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as PromiseLike<unknown>).then === 'function';

/**
 * Sends a controller method's return value as an HTTP response.
 * - `undefined`    → no-op (user handled the response manually)
 * - `null`         → 204 No Content
 * - `string`       → 200 JSON, as `message`. Never sniffed as HTML: a string often holds
 *                    user input, so that would be reflected XSS. Use `res.send()` for HTML.
 * - `Buffer`       → 200 binary send
 * - `object/array` → 200 application/json
 * - anything else  → 200 JSON (numbers, booleans, etc.)
 */
const sendControllerResult = (req: DRequest, res: DResponse, result: unknown, interceptor?: ResponseInterceptor): void => {
    if (result === undefined) return;

    if (result === null) {
        res.status(204).end();
        return;
    }

    if (Buffer.isBuffer(result)) {
        res.status(200).send(result);
        return;
    }

    if (typeof result === 'string') {
        if (interceptor) {
            const customData = interceptor(result, req, res);
            if (customData !== undefined && !res.headersSent) res.status(200).json(customData);
            return;
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: result,
            data: {}
        });
        return;
    }

    // object, array, number, boolean — serialise as JSON
    if (interceptor) {
        const customData = interceptor(result, req, res);
        if (customData !== undefined && !res.headersSent) res.status(200).json(customData);
        return;
    }

    res.status(200).json({
        success: true,
        status: 200,
        message: 'Request successful',
        data: result
    });
};


// function add cors middleware to express
const corsMiddleware = (corsOptions: CorsOptions) => cors(corsOptions) as AdapterHandler;

const helmetMiddleware = (helmetOptions?: HelmetOptions) => helmet(helmetOptions) as unknown as AdapterHandler;

/**
 * Function is used to register express router handlers using the **express routing** architecture
 */
const InitialiseRoutes = (adapter: HttpAdapter, routes: Array<{ path?: string; router: import("express").Router }>, basePath = "") => {
    routes.forEach((route) => {
        // const path = join(basePath, route.path || '');
        const path = normalizePath(join(basePath, route.path || '')).replace(/\\/g, '/');
        adapter.mountRouter(path, route.router);
    });
};

/**
 * Initialiser is responsible for registering all spring controllers as routers and detaching each method from the controller classes and registering them as handler functions.
 */
const InitialiseControllersAsRouter = (
    adapter: HttpAdapter,
    controllers: Array<{ new (): object }>,
    basePath: string,
    interceptor?: ResponseInterceptor,
) => {
    const registeredShields: string[] = [];

    controllers.forEach((Controller) => {
        try {
            const controllerInstance = new Controller();
            const classPath = Reflect.getMetadata('basePath', controllerInstance.constructor.prototype) || '';
            const controllerBasePath = classPath.startsWith('/') ? classPath : `/${classPath}`;

            /**
             * Retrieve shield middleware if present
             */
            const shieldMiddlewares = getShieldMiddlewares(Controller) || [];

            /**
             * register each controller method
             * Walk the full prototype chain so methods inherited through wrapping
             * (e.g. the Object.create layer added by @Component) are also discovered.
             */
            const allMethodNames = new Set<string>();
            let proto = Object.getPrototypeOf(controllerInstance);
            while (proto && proto !== Object.prototype) {
                Object.getOwnPropertyNames(proto).forEach((name) => allMethodNames.add(name));
                proto = Object.getPrototypeOf(proto);
            }
            Array.from(allMethodNames)
                .filter((name) => name !== 'constructor')
                .forEach((methodName) => {
                    if (methodName !== 'constructor') {
                        const method = Reflect.getMetadata('method', controllerInstance.constructor.prototype[methodName]);

                        const path = Reflect.getMetadata('path', controllerInstance.constructor.prototype[methodName]);

                        const middlewareList: Middleware[] =
                            Reflect.getMetadata('middleware', controllerInstance.constructor.prototype[methodName]) || [];

                        const renderTemplate =
                            Reflect.getMetadata('render', controllerInstance.constructor.prototype[methodName]) || undefined;

                        const { active, unmatched } = resolveRouteShields(
                            shieldMiddlewares,
                            getUnShieldMiddlewares(controllerInstance.constructor.prototype[methodName]),
                        );

                        unmatched.forEach((middleware) => {
                            inAppLogger.warn(
                                clc.yellow(
                                    `@UnShield on ${Controller.name}.${methodName}: '${middleware?.name || 'anonymous'}' is not a shield on this controller, so nothing was removed. Pass the same function reference given to @Shield.`,
                                ),
                            );
                        });

                        const finalMiddlewareList = [...active];

                        finalMiddlewareList.push(...middlewareList);

                        /**
                         * Todo: check the relevance of this code-block -- start
                         */
                        shieldMiddlewares.forEach((middleware: Middleware) => {
                            if (!registeredShields?.includes(middleware.name)) {
                                registeredShields.push(middleware.name);
                                inAppLogger.info(dolphMessages.middlewareMessages('Shield', middleware.name));
                            }
                        });
                        /**
                         * Todo: check the relevance of this code-block -- end
                         */

                        if (isExpressHttpMethod(method) && path) {
                            const fullPath = normalizePath(join(basePath, controllerBasePath, path)).replace(/\\/g, '/');

                            // Hoist constant per-route values — evaluated once at registration, not on every request
                            const controllerMethod = controllerInstance.constructor.prototype[methodName];
                            const expectedArgsCount = controllerMethod.length;
                            const routeArgsMetadata: RouteParamMetadata[] =
                                Reflect.getMetadata(
                                    ROUTE_ARGS_METADATA,
                                    controllerInstance.constructor.prototype,
                                    methodName,
                                ) || [];
                            const hasCoreParamDecorators = routeArgsMetadata.some(
                                (meta) => meta.index < expectedArgsCount && routeParamsArr.includes(meta.type),
                            );

                            // Fast path: no per-route middleware, no param decorators, no MVC template
                            const isAsyncMethod = controllerMethod.constructor.name === 'AsyncFunction';

                            if (finalMiddlewareList.length === 0 && !hasCoreParamDecorators && !renderTemplate) {
                                if (isAsyncMethod) {
                                    // Async fast-path — awaits the handler so errors propagate and delays are observed
                                    adapter.route(method, fullPath, [async (req: DRequest, res: DResponse, next: DNextFunc) => {
                                        try {
                                            const result = await controllerInstance[methodName](req, res, next);
                                            if (!res.headersSent) sendControllerResult(req, res, result, interceptor);
                                        } catch (error) {
                                            next(error);
                                        }
                                    }]);
                                } else {
                                    // Sync fast-path — plain handler, avoids Promise/async overhead on every request.
                                    // A non-`async` handler can still return a Promise (`return this.service.find()`,
                                    // or a decorator wrapping an async method), so the result has to be checked here:
                                    // `isAsyncMethod` only sees how the function was declared.
                                    adapter.route(method, fullPath, [(req: DRequest, res: DResponse, next: DNextFunc) => {
                                        try {
                                            const result = controllerInstance[methodName](req, res, next);

                                            if (isPromiseLike(result)) {
                                                Promise.resolve(result)
                                                    .then((resolved) => {
                                                        if (!res.headersSent) {
                                                            sendControllerResult(req, res, resolved, interceptor);
                                                        }
                                                    })
                                                    .catch(next);
                                                return;
                                            }

                                            if (!res.headersSent) sendControllerResult(req, res, result, interceptor);
                                        } catch (error) {
                                            next(error);
                                        }
                                    }]);
                                }
                                inAppLogger.info(dolphMessages.routeMessages(methodName, method, fullPath));
                                return;
                            }

                            const handler = async (req: DRequest, res: DResponse, next: DNextFunc) => {
                                try {
                                    if (res.headersSent) {
                                        return;
                                    }

                                    // -- Decorator Resolution Logic --
                                    const args: any[] = new Array(expectedArgsCount);

                                    if (routeArgsMetadata.length > 0) {
                                        for (const meta of routeArgsMetadata) {
                                            if (meta.index < expectedArgsCount) {
                                                switch (meta.type) {
                                                    case 'req':
                                                        args[meta.index] = req;
                                                        break;
                                                    case 'res':
                                                        args[meta.index] = res;
                                                        break;
                                                    case 'next':
                                                        args[meta.index] = next;
                                                        break;
                                                    case 'payload':
                                                        args[meta.index] = req.payload;
                                                        break;
                                                    case 'param':
                                                        try {
                                                            const dtoClass = meta.data?.dtoType as
                                                                | ClassConstructor<object>
                                                                | undefined;

                                                            args[meta.index] = await transformAndValidateDto(
                                                                dtoClass,
                                                                req.params,
                                                                'request params',
                                                            );
                                                        } catch (error) {
                                                            throw error;
                                                        }
                                                        break;
                                                    case 'query':
                                                        try {
                                                            const dtoClass = meta.data?.dtoType as
                                                                | ClassConstructor<object>
                                                                | undefined;

                                                            args[meta.index] = await transformAndValidateDto(
                                                                dtoClass,
                                                                req.query ?? {},
                                                                'request query',
                                                                { forbidNonWhitelisted: false },
                                                            );
                                                        } catch (error) {
                                                            throw error;
                                                        }
                                                        break;
                                                    case 'file':
                                                        args[meta.index] = req.file;
                                                        break;
                                                    case 'headers':
                                                        args[meta.index] = req.headers;
                                                        break;
                                                    case 'cookies':
                                                        args[meta.index] = req.cookies || {};
                                                        break;
                                                    case 'auth':
                                                        args[meta.index] = req.headers['authorization'] || req.headers['Authorization'];
                                                        break;
                                                    case 'body':
                                                        try {
                                                            const dtoClass = meta.data?.dtoType as
                                                                | ClassConstructor<object>
                                                                | undefined;

                                                            args[meta.index] = await transformAndValidateDto(
                                                                dtoClass,
                                                                req.body,
                                                                'request body',
                                                            );
                                                        } catch (error) {
                                                            throw error;
                                                        }
                                                        break;
                                                }
                                            }
                                        }
                                    }

                                    // Fall back to positional arguments for routes not using param decorators
                                    if (!hasCoreParamDecorators) {
                                        if (expectedArgsCount >= 1) args[0] = req;
                                        if (expectedArgsCount >= 2) args[1] = res;
                                        if (expectedArgsCount >= 3) args[2] = next;
                                    }

                                    const result = await controllerInstance[methodName](...args);

                                    if (renderTemplate && !res.headersSent) {
                                        // Pass the already-awaited result as the template data.
                                        // Previously this incorrectly re-invoked the controller method a second time.
                                        res.render(renderTemplate, result ?? {});
                                    } else if (!res.headersSent) {
                                        sendControllerResult(req, res, result, interceptor);
                                    }
                                } catch (error) {
                                    next(error);
                                }
                            };

                            adapter.route(method, fullPath, [...finalMiddlewareList, handler]);
                            inAppLogger.info(dolphMessages.routeMessages(methodName, method, fullPath));
                        }
                    }
                });
            registeredShields.length = 0;
        } catch (e) {
            // Fail at boot: continuing would silently drop every route on this controller.
            throw new Error(`Error initialising controller ${Controller.name}: ${e.message}`, { cause: e });
        }
    });
};

const initViews = (adapter: HttpAdapter, views?: DolphConfigViews) => {
    if (!views) return;

    const { engine, dir, assets } = views;

    if (!engine || !dir || !assets) {
        throw new Error('`views` in dolph_config.yaml needs `engine`, `dir` and `assets`.');
    }

    adapter.useViews({ engine, assetsPath: resolve(assets), viewsDir: resolve(dir) });
};

// default not found endpoint
const initNotFoundError = (adapter: HttpAdapter) => {
    adapter.useNotFound((_req: DRequest, res: DResponse) => {
        ErrorResponse({ res, status: httpStatus.NOT_FOUND, body: { message: 'this endpoint does not exist' } });
    });
};

// Apollo's middleware has no path of its own, so unscoped it would answer every URL.
const onlyAtGraphQLPath = (middleware: AdapterHandler): AdapterHandler => (req, res, next) => {
    const path = String(req.originalUrl ?? req.url).split('?')[0];

    return path === GRAPHQL_PATH || path === `${GRAPHQL_PATH}/` ? middleware(req, res, next) : next();
};

/**
 * The main engine for the dolph framework. The constructor only stores what it's given.
 * Nothing runs until it's asked for, in three stages that each run once:
 *
 * - `engine()` wires the HTTP server, which is enough for tests.
 * - `ready()` also connects databases, GraphQL and sockets.
 * - `start()` also listens on the port.
 *
 * `stop()` undoes all of it.
 *
 * @version 3.0
 */
class DolphFactoryClass {
    private readonly routes: Array<{ path?: string; router: Router }> = [];
    private controllers: Array<{ new (): any }> = [];
    private readonly options: DolphOptions;

    private configs: DolphConfig = {};
    private adapter: HttpAdapter;
    private server: Server;
    private port: number = DEFAULT_PORT;
    private env = configs.NODE_ENV;
    private routingBase = '';
    private jsonLimit = '5mb';
    private socketService?: SocketService;
    private databaseClosers: DatabaseCloser[] = [];
    private processHandlers: Array<[string, (...args: any[]) => void]> = [];

    private wired = false;
    private connecting?: Promise<void>;
    private starting?: Promise<Server>;
    private stopping?: Promise<void>;

    constructor(components: DolphComponents = [], options: DolphOptions = {}) {
        // These shapes were valid in 2.x, and a JavaScript app would otherwise lose
        // its middleware or GraphQL schema without a word.
        if (!Array.isArray(components) || Array.isArray(options)) {
            throw new TypeError(
                'DolphFactory takes (components, options), for example new DolphFactory([UserComponent], { middlewares: [] }).',
            );
        }

        this.options = options;

        components.forEach((item) => {
            if ('router' in item) {
                this.routes.push(item);
            } else if (!this.controllers.includes(item)) {
                this.controllers.push(item);
            }
        });
    }

    /**
     * Method responsible for reading the controllers from components and registering them in the controllers array
     */
    private extractControllersFromComponent() {
        const newControllers: Array<{ new (): object }> = [];

        this.controllers.forEach((componentClass) => {
            const extractedControllers = getControllersFromMetadata(componentClass);
            if (extractedControllers?.length) {
                newControllers.push(...extractedControllers);
            }
        });

        this.controllers = [...newControllers];
    }

    /**
     * Reads the [dolph_config.yaml] file present in project's root directory
     */
    private readConfigFile() {
        try {
            this.configs = (yaml.load(readFileSync('dolph_config.yaml', 'utf8')) as DolphConfig) ?? {};
        } catch (e) {
            if (e?.code === 'ENOENT') {
                logger.error(clc.red(DolphErrors.noDolphConfigFile));
            }
            throw e;
        }

        const config = this.configs;

        // Left in place after upgrading, this would otherwise mean an app with no database.
        if ('sequelize' in (config.database ?? {})) {
            throw new Error('`database.sequelize` is no longer supported. Use `database.typeorm`.');
        }

        if ('globalExceptionFilter' in config) {
            inAppLogger.warn(
                clc.yellow('`globalExceptionFilter` is no longer read. Pass `onError` to DolphFactory instead.'),
            );
        }

        configLoader(config.env);
        this.env = configs.NODE_ENV;
        this.port = this.resolvePort(config.port);

        if (config.routing?.base?.length) {
            this.routingBase = config.routing.base;
        }

        if (config.jsonLimit?.length) {
            this.jsonLimit = config.jsonLimit;
        } else {
            inAppLogger.warn(
                clc.yellow(
                    "jsonLimit value should be added to `dolph_config` file else default value of '5mb' would be used",
                ),
            );
        }
    }

    // Hosts like Heroku and Render assign the port through PORT, so it has to beat the file.
    private resolvePort(configured?: dolphPort) {
        const value = process.env.PORT || configured;

        if (value === undefined || value === null) return DEFAULT_PORT;

        const port = Number(value);

        if (Number.isInteger(port) && port >= 0) return port;

        inAppLogger.warn(clc.yellow(`Invalid port '${String(value)}'; using ${DEFAULT_PORT}.`));

        return DEFAULT_PORT;
    }

    private initSecurityMiddlewares() {
        const { cors: corsConfig, helmet: helmetConfig } = this.configs.middlewares ?? {};

        if (corsConfig?.activate) {
            const { activate: _activate, origin, ...corsOptions } = corsConfig;

            if (!origin) {
                inAppLogger.warn(
                    clc.yellow(
                        "CORS is on but `origin` is empty, so no cross-origin requests are allowed. Set `origin` in dolph_config.yaml, or use '*' to allow every site.",
                    ),
                );
            }

            // Unset keys are left out: the cors package would treat an
            // explicit undefined as a value and lose its own defaults.
            this.adapter.useSecurity(
                corsMiddleware({
                    ...Object.fromEntries(Object.entries(corsOptions).filter(([, value]) => value != null)),
                    // An empty origin used to mean every site. Allowing everyone has to be asked for.
                    origin: origin || false,
                }),
            );
        }

        if (helmetConfig) {
            this.adapter.useSecurity(helmetMiddleware(helmetConfig === true ? undefined : helmetConfig));
        }
    }

    private wire() {
        if (this.wired) return;
        this.wired = true;

        const startTime = process.hrtime();

        this.extractControllersFromComponent();
        this.readConfigFile();

        this.adapter = createHttpAdapter(this.configs.adapter);
        this.server = this.adapter.server;

        this.initSecurityMiddlewares();
        this.adapter.useBodyParsers({ jsonLimit: this.jsonLimit });
        this.options.middlewares?.forEach((middleware) => this.adapter.use(middleware));
        initViews(this.adapter, this.configs.views);
        InitialiseRoutes(this.adapter, this.routes, this.routingBase);
        InitialiseControllersAsRouter(this.adapter, this.controllers, this.routingBase, this.options.onResponse);

        this.adapter.useErrorHandlers([
            ...(this.options.onError ? [this.options.onError] : []),
            errorConverter,
            errorHandler,
        ]);
        initNotFoundError(this.adapter);

        const endTime = process.hrtime(startTime);
        const durationInMilliseconds = Math.round(endTime[0] * 1000 + endTime[1] / 1e6);

        logger.info(`${clc.blueBright('Initialised application in')} ${clc.white(`${durationInMilliseconds}ms`)}`);
    }

    private async connectGraphQL() {
        const { graphql } = this.options;
        if (!graphql) return;

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GraphQLAdapter } = require('@dolphjs/graphql');

        const middleware = await GraphQLAdapter.apolloServer(this.server, graphql.schema, graphql.context);

        // The registrar logs its own failure and resolves with nothing.
        if (!middleware) {
            throw new Error('GraphQL server failed to start.');
        }

        this.adapter.use(onlyAtGraphQLPath(middleware));
    }

    private connectSockets() {
        const { sockets } = this.options;
        if (!sockets) return;

        this.socketService = new SocketService({
            server: this.server,
            options: sockets.options ?? {},
            auth: sockets.auth,
        });

        GlobalInjection(SocketService.name, this.socketService);

        logger.info(`${clc.blue(`SocketIO Initialised Successfully`)}`);

        const socketsMetadata = Reflect.getMetadata('sockets', sockets.component.constructor.prototype);

        if (socketsMetadata && Array.isArray(socketsMetadata)) {
            socketsMetadata.forEach((socketServiceClass) => {
                new socketServiceClass();

                logger.info(
                    `${clc.blue(`${clc.white(`${socketServiceClass.name}`)} can now receive and send websocket events`)}`,
                );
            });
        }
    }

    private async connect() {
        this.wire();
        this.databaseClosers = await connectDatabases(this.configs.database);
        await this.connectGraphQL();
        this.connectSockets();
    }

    private async bootstrap() {
        this.installProcessHandlers();

        await this.ready();
        await this.adapter.listen(this.port, '0.0.0.0');

        logger.info(
            clc.blueBright(`Dolph app running on port ${clc.white(`${this.port}`)} in ${this.env.toUpperCase()} mode`),
        );

        return this.server;
    }

    private async shutdown() {
        this.processHandlers.forEach(([event, handler]) => process.off(event, handler));
        this.processHandlers = [];

        // Closing during startup has to wait, or a database connecting right now would stay open.
        await this.connecting?.catch(() => undefined);

        // Nothing to close if the app never wired, or failed before reaching the adapter.
        if (!this.adapter) return;

        const forceClose = setTimeout(() => this.server.closeAllConnections(), DRAIN_TIMEOUT_MS);
        forceClose.unref();

        try {
            await Promise.all([this.adapter.close(), this.socketService?.getSocket().close()]);
        } finally {
            clearTimeout(forceClose);
            await Promise.all(this.databaseClosers.map((close) => close()));
        }
    }

    private exit(code: number) {
        const forceExit = setTimeout(() => process.exit(code), EXIT_TIMEOUT_MS);
        forceExit.unref();

        this.stop()
            .catch((error) => logger.error(clc.red(error)))
            .finally(() => {
                clearTimeout(forceExit);
                process.exit(code);
            });
    }

    // A failed startup lands here too when start() isn't awaited, which is how a
    // one-line `dolph.start()` still logs the reason and exits.
    private installProcessHandlers() {
        const crash = (error: Error) => {
            logger.error(clc.red(error?.stack ?? error));
            this.exit(1);
        };

        this.processHandlers = [
            ['uncaughtException', crash],
            ['unhandledRejection', crash],
            ['SIGTERM', () => this.exit(0)],
        ];

        this.processHandlers.forEach(([event, handler]) => process.on(event, handler));
    }

    /**
     * The request listener, for `createServer()`, supertest, or reaching Express or Fastify
     * directly. Doesn't connect anything, so tests need no database.
     */
    public engine = () => {
        this.wire();
        return this.adapter.requestListener() as import('express').Express;
    };

    public socket = () => this.socketService;

    /**
     * Wires the app and connects databases, GraphQL and sockets, without listening.
     * Rejects if a required database can't connect.
     */
    public ready(): Promise<void> {
        this.connecting ??= this.connect();
        return this.connecting;
    }

    /**
     * Connects everything, then listens on the port. Rejects if startup fails. Without
     * `await` or a `catch`, a failed startup logs the error and exits with code 1.
     */
    public start(): Promise<Server> {
        this.starting ??= this.bootstrap();
        return this.starting;
    }

    /**
     * Finishes open requests, then closes sockets and databases. Also runs on SIGTERM.
     */
    public stop(): Promise<void> {
        this.stopping ??= this.shutdown();
        return this.stopping;
    }
}

export { DolphFactoryClass as DolphFactory };
