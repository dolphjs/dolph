import 'reflect-metadata';
import { ErrorRequestHandler, RequestHandler, Router, urlencoded } from 'express';
import { CorsOptions } from 'cors';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import clc from 'cli-color';
import {
    DNextFunc,
    DRequest,
    DRequestHandler,
    DResponse,
    Dolph,
    DolphConfig,
    ErrorResponse,
    Middleware,
    MongooseConfig,
    TypeOrmConfig,
    SqlConfig,
    dolphPort,
    ResponseInterceptor,
} from '../common';
import { inAppLogger, logger } from '../utilities';
import { autoInitMongo, autoInitSql, autoInitTypeOrm, SocketService } from '../packages';
import { DolphErrors, dolphMessages } from '../common/constants';
import express from 'express';
import cors from 'cors';
import { configLoader, configs } from './config.core';
import helmet, { HelmetOptions } from 'helmet';
import { errorConverter, errorHandler } from './error.core';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { normalizePath } from '../utilities/normalize_path.utilities';
import { DolphControllerHandler } from '../classes';
import { getControllersFromMetadata } from '../utilities/get_controllers_from_component';
import { getShieldMiddlewares, getUnShieldMiddlewares, stringifyFunction } from '../utilities/spring_helpers.utilities';
import { DSocketInit } from '../common/interfaces/socket.interfaces';
import { GlobalInjection } from './initialisers';
import { middlewareRegistry } from './initialisers/middleware_registrar';
import { join } from 'path';
import { MVCAdapter } from './adapters/mvc_registrar';
import { engine as handlebars } from 'express-handlebars';
import { ROUTE_ARGS_METADATA, RouteParamMetadata, routeParamsArr } from '../decorators';
import httpStatus from 'http-status';
import { ClassConstructor } from 'class-transformer';
import { transformAndValidateDto } from './transformer';

type ExpressHttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

const isExpressHttpMethod = (value: unknown): value is ExpressHttpMethod =>
    typeof value === 'string' && ['get', 'post', 'patch', 'put', 'delete'].includes(value);

/**
 * Sends a controller method's return value as an HTTP response.
 * - `undefined`    → no-op (user handled the response manually)
 * - `null`         → 204 No Content
 * - `string`       → 200 text/plain (or text/html if it looks like HTML)
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
        const isHtml = result.trimStart().startsWith('<');
        if (isHtml) {
            res.status(200).contentType('text/html').send(result);
            return;
        }

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
const enableCorsFunc = (engine: import("express").Express, corsOptions: CorsOptions) => {
    engine.use(cors(corsOptions));
};

const enableHelmetFunc = (engine: import("express").Express, helmetOptions?: HelmetOptions) => {
    engine.use(helmet(helmetOptions));
};

/**
 * Function is used to register express router handlers using the **express routing** architecture
 */
const InitialiseRoutes = (engine: import("express").Express, routes: Array<{ path?: string; router: import("express").Router }>, basePath = "") => {
    routes.forEach((route) => {
        // const path = join(basePath, route.path || '');
        const path = normalizePath(join(basePath, route.path || '')).replace(/\\/g, '/');
        engine.use(path, route.router);
    });
};

/**
 * Initialiser is responsible for registering all spring controllers as routers and detaching each method from the controller classes and registering them as handler functions.
 */
const InitialiseControllersAsRouter = <T extends Dolph>(
    engine: import("express").Express,
    controllers: Array<{ new (): DolphControllerHandler<T> }>,
    basePath: string,
    factory?: any
) => {
    const registeredShields: string[] = [];

    controllers.forEach((Controller) => {
        try {
            const controllerInstance = new Controller();
            const classPath = Reflect.getMetadata('basePath', controllerInstance.constructor.prototype) || '';
            const controllerBasePath = classPath.startsWith('/') ? classPath : `/${classPath}`;
            const router = Router();

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

                        let finalMiddlewareList = [...shieldMiddlewares];
                        /**
                         * Append any present shield middleware into the middlewares list
                         */

                        /**
                         * Todo: abstract to helper function
                         */

                        const unshieldedMiddlewares = getUnShieldMiddlewares(
                            controllerInstance.constructor.prototype[methodName],
                        );

                        if (unshieldedMiddlewares?.length) {
                            const setOne = new Set(finalMiddlewareList.map(stringifyFunction));
                            const setTwo = new Set(unshieldedMiddlewares.map(stringifyFunction));

                            const uniqueToShield = finalMiddlewareList.filter(
                                (func) => !setTwo.has(stringifyFunction(func)),
                            );
                            const uniqueToUnShield = unshieldedMiddlewares.filter(
                                (func) => !setOne.has(stringifyFunction(func)),
                            );

                            finalMiddlewareList = [...uniqueToShield, ...uniqueToUnShield];
                        } else {
                            // middlewareList.unshift(...individualShieldMiddlewares);
                        }

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
                                    router[method](fullPath, async (req: DRequest, res: DResponse, next: DNextFunc) => {
                                        try {
                                            const result = await controllerInstance[methodName](req, res, next);
                                            if (!res.headersSent) sendControllerResult(req, res, result, factory?.responseInterceptor);
                                        } catch (error) {
                                            next(error);
                                        }
                                    });
                                } else {
                                    // Sync fast-path — plain handler, avoids Promise/async overhead on every request
                                    router[method](fullPath, (req: DRequest, res: DResponse, next: DNextFunc) => {
                                        try {
                                            const result = controllerInstance[methodName](req, res, next);
                                            if (!res.headersSent) sendControllerResult(req, res, result, factory?.responseInterceptor);
                                        } catch (error) {
                                            next(error);
                                        }
                                    });
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
                                        sendControllerResult(req, res, result, factory?.responseInterceptor);
                                    }
                                } catch (error) {
                                    next(error);
                                }
                            };

                            // parse the handler function together with full path to the express router object
                            router[method](fullPath, ...finalMiddlewareList, handler);
                            inAppLogger.info(dolphMessages.routeMessages(methodName, method, fullPath));
                        }
                    }
                });
            registeredShields.length = 0;

            // register the router object in the express engine
            engine.use('/', router);
        } catch (e) {
            console.error(e);
            logger.error(clc.red(`Error initialising controller ${Controller.name}: ${e.message}`));
        }
    });
};

// used to increment the limit of listeners for express engine
const incrementHandlers = () => {
    process.setMaxListeners(10);
};

// Initialises middlewares used by dolphjs
const InitialiseMiddlewares = (engine: import("express").Express, { jsonLimit }: { jsonLimit: string }) => {
    engine.use(express.json({ limit: jsonLimit }));
    engine.use(express.urlencoded({ extended: true }));
};

// registers middlewares defined by user
const initExternalMiddlewares = (engine: import("express").Express, middlewares: DRequestHandler[]) => {
    if (middlewares?.length) {
        middlewares.forEach((middleware) => {
            engine.use(middleware);
        });
    }
};

const initGlobalMiddlewares = (engine: import("express").Express) => {
    const middlewares = middlewareRegistry.getMiddlewares();
    middlewares.forEach((middleware) => {
        engine.use(middleware);
    });
};

const initMvcAdapter = (engine: import("express").Express) => {
    const MVCEngine = MVCAdapter.getViewEngine();
    const MVCAssetsPath = MVCAdapter.getAssetsPath();
    const MVCViewsDir = MVCAdapter.getViewsDir();

    if (MVCEngine && MVCAssetsPath?.length && MVCViewsDir?.length) {
        engine.use(urlencoded({ extended: true }));
        engine.use(express.static(MVCAssetsPath));
        engine.set('view engine', MVCEngine);

        switch (MVCEngine) {
            case 'handlebars':
                engine.engine(
                    'handlebars',
                    handlebars({
                        defaultLayout: MVCViewsDir,
                    }),
                );
                break;
            case 'ejs':
                engine.use('views', express.static(MVCViewsDir));
                break;
            case 'pug':
                engine.use('views', express.static(MVCViewsDir));
                break;
            default:
                break;
        }
    }
};

// default not found endpoint
const initNotFoundError = (engine: import("express").Express) => {
    engine.use('/', (req: DRequest, res: DResponse) => {
        ErrorResponse({ res, status: httpStatus.NOT_FOUND, body: { message: 'this endpoint does not exist' } });
    });
};

// loads configs from env
const InitialiseConfigLoader = () => {
    configLoader();
};

// Initialises error handlers and converters
const InitialiseErrorHandlers = (engine: import("express").Express) => {
    engine.use(errorConverter);
    engine.use(errorHandler);
};

// exist handler
const exitHandler = (server: Server<typeof IncomingMessage, typeof ServerResponse>) => {
    if (server) {
        server.close(() => {
            logger.error(clc.red(DolphErrors.serverClosed));
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (server: Server<typeof IncomingMessage, typeof ServerResponse>, error: Error) => {
    logger.error(clc.red(error));
    exitHandler(server);
};

const initClosureHandler = (server: Server<typeof IncomingMessage, typeof ServerResponse>) => {
    process.on('uncaughtException', (err) => unexpectedErrorHandler(server, err));
    process.on('unhandledRejection', (err: Error) => unexpectedErrorHandler(server, err));

    process.on('SIGTERM', () => {
        if (server) {
            server.close(() => {
                process.exit(0);
            });
            // Force exit after 10 s if keep-alive connections don't drain
            setTimeout(() => {
                process.exit(0);
            }, 10_000).unref();
        }
    });
};

/**
 * The main engine for the dolph framework
 *
 *
 * @version 2.0
 */
class DolphFactoryClass {
    private routes: Array<{ path?: string; router: Router }> = [];
    private controllers: Array<{ new (): any }> = [];
    private sockets?: DSocketInit;
    private socketService?: SocketService;
    private server: Server<typeof IncomingMessage, typeof ServerResponse>;
    private routingBase = '';
    private isGraphQL = false;

    port: dolphPort = process.env.PORT || 3030;
    env = process.env.NODE_ENV || 'development';
    configs: DolphConfig = {};
    externalMiddlewares: RequestHandler[] = [];
    jsonLimit = '5mb';
    globalFilter = false;
    private globalExceptionFilterHandler?: ErrorRequestHandler;
    private dolph: import("express").Express;
    private responseInterceptor?: ResponseInterceptor;

    constructor(adapter: { graphql: boolean; schema: any; context?: any });
    constructor(
        routes: Array<{ new (): any } | { path?: string; router: Router }>,
        middlewares?: RequestHandler[] | DSocketInit,
        sockets?: DSocketInit,
    );

    constructor(
        adapterOrRoutes?:
            | Array<{ new (): any } | { path?: string; router: Router }>
            | { graphql: boolean; schema: any; context?: any },
        middlewares?: RequestHandler[] | DSocketInit,
        socketsInit?: DSocketInit,
    ) {
        /**
         * Start dolphjs initialisation time
         */
        const startTime = process.hrtime();

        if (this.isAdapter(adapterOrRoutes)) {
            const adapter = adapterOrRoutes;

            if (adapter.graphql) {
                this.isGraphQL = adapter.graphql;

                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { GraphQLAdapter } = require('@dolphjs/graphql');

                GraphQLAdapter.apolloServer(this.server, adapter.schema, adapter.context)
                    .then((middleware: RequestHandler) => {
                        this.dolph.use(middleware);
                    })
                    .catch((err: Error) => {
                        logger.error(`${clc.red('DOLPH ERROR: ')}`, err);
                    });
            }
        } else {
            const routes = adapterOrRoutes;

            if (!routes || !Array.isArray(routes)) return;

            routes.forEach((item) => {
                if ('router' in item) {
                    this.routes.push(item);
                } else {
                    if (!this.controllers.some((c) => c === item)) {
                        this.controllers.push(item);
                    }
                }
            });

            if (Array.isArray(middlewares)) {
                this.externalMiddlewares = middlewares as RequestHandler[];
            } else if (typeof middlewares === 'object' && middlewares !== null && 'socketService' in middlewares) {
                this.sockets = middlewares as DSocketInit;
            }
            if (typeof socketsInit === 'object' && socketsInit !== null && 'socketService' in socketsInit) {
                this.sockets = socketsInit;
            }
        }

        this.dolph = express();
        this.dolph.disable('x-powered-by');
        this.server = createServer(this.dolph);
        this.extractControllersFromComponent();
        this.readConfigFile();
        this.intiDolphEngine(startTime);
    }

    private isAdapter(arg: any): arg is { graphql: boolean; schema: any; context?: any } {
        return (
            arg !== null && typeof arg == 'object' && 'graphql' in arg && 'schema' in arg && typeof arg.graphql == 'boolean'
        );
    }

    /**
     * Method responsible for reading the controllers from components and registering them in the controllers array
     */
    private extractControllersFromComponent() {
        const newControllers: Array<{ new (): DolphControllerHandler<Dolph> }> = [];

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
            const configContents = readFileSync('dolph_config.yaml', 'utf8');

            const config: DolphConfig = yaml.load(configContents) as unknown as DolphConfig;

            this.configs = config;

            if (config.port) {
                const parsedPort = typeof config.port === 'string' ? Number(config.port) : config.port;
                if (Number.isFinite(parsedPort) && parsedPort > 0) {
                    this.changePort(parsedPort);
                } else {
                    inAppLogger.warn(
                        clc.yellow(
                            `Invalid port '${String(config.port)}' in dolph_config.yaml; using current/default port.`,
                        ),
                    );
                }
            }

            if (config.env?.length) {
                this.env = config.env;
            }

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

            const mongoCfgConfig: MongooseConfig | undefined = this.configs?.database?.mongo;
            if (mongoCfgConfig?.url?.length && mongoCfgConfig.url.length > 1) {
                const mongoCfg = { ...mongoCfgConfig };
                if (mongoCfg.url === 'sensitive') {
                    if (!configs.MONGO_URL) {
                        logger.error('cannot find `MONGO_URL` in the projects `.env` file');
                    }
                    mongoCfg.url = configs.MONGO_URL || '';
                }
                autoInitMongo(mongoCfg);
            }

            const typeOrmConfig: TypeOrmConfig | undefined = this.configs?.database?.typeorm;
            if (typeOrmConfig?.options) {
                if ((typeOrmConfig.options as any).url === 'sensitive') (typeOrmConfig.options as any).url = configs.SQL_URL;
                if ((typeOrmConfig.options as any).username === 'sensitive') (typeOrmConfig.options as any).username = configs.SQL_USER;
                if ((typeOrmConfig.options as any).password === 'sensitive') (typeOrmConfig.options as any).password = configs.SQL_PASSWORD;
                if ((typeOrmConfig.options as any).host === 'sensitive') (typeOrmConfig.options as any).host = configs.SQL_HOST;
                autoInitTypeOrm(typeOrmConfig);
            }

            const sequelizeConfig: SqlConfig | undefined = this.configs?.database?.sequelize;
            if (sequelizeConfig?.database) {
                if (sequelizeConfig.user === 'sensitive') sequelizeConfig.user = configs.SQL_USER;
                if (sequelizeConfig.pass === 'sensitive') sequelizeConfig.pass = configs.SQL_PASSWORD;
                if (sequelizeConfig.host === 'sensitive') sequelizeConfig.host = configs.SQL_HOST;
                
                if (sequelizeConfig.options) {
                    if ((sequelizeConfig.options as any).username === 'sensitive') (sequelizeConfig.options as any).username = configs.SQL_USER;
                    if ((sequelizeConfig.options as any).password === 'sensitive') (sequelizeConfig.options as any).password = configs.SQL_PASSWORD;
                    if (sequelizeConfig.options.host === 'sensitive') sequelizeConfig.options.host = configs.SQL_HOST;
                }

                autoInitSql(sequelizeConfig);
            }

            if (config.middlewares) {
                if (config.middlewares.cors?.activate) {
                    const {
                        optionsSuccessStatus,
                        allowedHeaders,
                        credentials,
                        exposedHeaders,
                        maxAge,
                        origin,
                        preflightContinue,
                    } = config.middlewares.cors;
                    enableCorsFunc(this.dolph, {
                        optionsSuccessStatus,
                        allowedHeaders: allowedHeaders ?? undefined,
                        exposedHeaders: exposedHeaders ?? undefined,
                        credentials,
                        maxAge,
                        origin: origin || '*',
                        preflightContinue,
                    });
                }
            }

            if (config.globalExceptionFilter) {
                this.globalFilter = true;
            }
        } catch (e) {
            logger.error(clc.red(DolphErrors.noDolphConfigFile));
            throw e;
        }
    }

    private changePort(port: dolphPort) {
        this.port = port;
    }

    public middlewares(middlewares?: RequestHandler[]) {
        initExternalMiddlewares(this.dolph, middlewares ?? []);
    }

    private intiDolphEngine(startTime: [number, number]) {
        
        InitialiseConfigLoader();
        incrementHandlers();
        InitialiseMiddlewares(this.dolph, { jsonLimit: this.jsonLimit });
        initExternalMiddlewares(this.dolph, this.externalMiddlewares || []);
        initGlobalMiddlewares(this.dolph);
        initMvcAdapter(this.dolph);
        InitialiseRoutes(this.dolph, this.routes, this.routingBase);
        InitialiseControllersAsRouter(this.dolph, this.controllers, this.routingBase, this);


        /**
         * End the time recording and obtain duration
         */
        const endTime = process.hrtime(startTime);

        const durationInMilliseconds = Math.round(endTime[0] * 1000 + endTime[1] / 1e6);

        logger.info(`${clc.blueBright('Initialised application in')} ${clc.white(`${durationInMilliseconds}ms`)}`);

        middlewareRegistry.seal();
    }

    public setGlobalExceptionHandler(handler: ErrorRequestHandler) {
        this.globalExceptionFilterHandler = handler;
        this.globalFilter = true;
    }

    public setResponseInterceptor(interceptor: ResponseInterceptor) {
        this.responseInterceptor = interceptor;
    }

    /**
     * @deprecated Configure CORS via the `middlewares.cors` section in `dolph_config.yaml` instead.
     * This method will be removed in the next major version.
     */
    public enableCors(options?: CorsOptions) {
        inAppLogger.warn(
            clc.yellow(
                '`enableCors()` is deprecated and will be removed in the next major version. Use the `middlewares.cors` section in `dolph_config.yaml` instead.',
            ),
        );
        enableCorsFunc(this.dolph, options || { origin: '*' });
    }

    public enableHemet(options?: HelmetOptions) {
        if (options) {
            enableHelmetFunc(this.dolph, options);
        } else {
            enableHelmetFunc(this.dolph);
        }
    }

    private initSockets(server: Server<typeof IncomingMessage, typeof ServerResponse>) {
        const socketInit = this.sockets;
        if (!socketInit?.socketService) {
            return;
        }

        const SocketServiceCtor = socketInit.socketService;
        this.socketService = new SocketServiceCtor({ server, options: socketInit.options ?? {} });

        GlobalInjection(SocketServiceCtor.name, this.socketService);

        logger.info(`${clc.blue(`SocketIO Initialised Successfully`)}`);

        const socketsMetadata = Reflect.getMetadata('sockets', socketInit.component.constructor.prototype);

        if (socketsMetadata && Array.isArray(socketsMetadata)) {
            socketsMetadata.forEach((socketServiceClass) => {
                new socketServiceClass();

                logger.info(
                    `${clc.blue(`${clc.white(`${socketServiceClass.name}`)} can now receive and send websocket events`)}`,
                );
            });
        }
    }

    public engine = () => this.dolph;
    public socket = () => this.socketService;

    /**
     * Initialises and returns the dolphjs engine
     */
    public start() {
        if (this.globalFilter) {
            if (this.globalExceptionFilterHandler) {
                this.dolph.use(this.globalExceptionFilterHandler);
                logger.info(clc.blueBright(`Dolph app using custom global exception filter`));
            } else {
                inAppLogger.warn(
                    clc.yellow(
                        'globalExceptionFilter is true in config, but no handler was provided via setGlobalExceptionHandler(). Error handling will fall back to default.',
                    ),
                );
            }
        }

        InitialiseErrorHandlers(this.dolph);

        if (!this.isGraphQL) {
            initNotFoundError(this.dolph);
        }

        if (!this.isGraphQL) {
            this.server = this.dolph.listen(+this.port, '0.0.0.0', () => {
                logger.info(
                    clc.blueBright(
                        `Dolph app running on port ${clc.white(`${this.port}`)} in ${this.env.toUpperCase()} mode`,
                    ),
                );
                this.initSockets(this.server);
            });
        } else {
            const start = async () => {
                //@ts-expect-error -- server.listen callback typing does not match Promise resolve
                await new Promise((resolve) => this.server.listen({ port }, resolve));
            };

            start()
                .then(() => {
                    logger.info(
                        clc.blueBright(
                            `Dolph app running on port ${clc.white(`${this.port}`)} in ${this.env.toUpperCase()} mode`,
                        ),
                    );

                    this.initSockets(this.server);
                })
                .catch((err) => {
                    logger.error(clc.red(`Cannot start Dolph Server: ${err}`));
                });
        }

        initClosureHandler(this.server);
        return this.server;
    }
}

export { DolphFactoryClass as DolphFactory };
