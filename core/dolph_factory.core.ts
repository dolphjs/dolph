import 'reflect-metadata';
import { RequestHandler, Router } from 'express';
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
  dolphPort,
} from '../common';
import { inAppLogger, logger } from '../utilities';
import { autoInitMongo } from '../packages';
import { DolphErrors, dolphMessages } from '../common/constants';
import express from 'express';
import cors from 'cors';
import { configLoader, configs } from './config.core';
import { morganErrorHandler, successHandler } from './morgan.core';
import helmet from 'helmet';
import { errorConverter, errorHandler } from './error.core';
import { IncomingMessage, Server, ServerResponse } from 'http';
import xss from 'xss';
import cookieParser from 'cookie-parser';
import { normalizePath } from '../utilities/normalize_path.utilities';
import { DolphControllerHandler } from '../classes';
import { getControllersFromMetadata } from '../utilities/get_controllers_from_component';
import { getShieldMiddlewares } from '../utilities/spring_helpers.utilities';

const engine = express();

// declare core variables
let env = configs.NODE_ENV;
let port = configs.PORT;
let server: Server<typeof IncomingMessage, typeof ServerResponse>;

// function add cors middleware to express
const enableCorsFunc = (corsOptions: CorsOptions) => {
  engine.use(cors(corsOptions));
};

/**
 * Function is used to register express router handlers using the **express routing** architecture
 */
const initializeRoutes = (routes: Array<{ path?: string; router: import('express').Router }>) => {
  routes.forEach((route) => {
    engine.use('/', route.router);
  });
};

/**
 * Initializer is responsible for registering all spring controllers as routers and detaching each method from the controller classes and registering them as handler functions.
 */
const initializeControllersAsRouter = <T extends Dolph>(controllers: Array<{ new (): DolphControllerHandler<T> }>) => {
  const registeredShields: string[] = [];

  controllers.forEach((Controller) => {
    try {
      const controllerInstance = new Controller();
      const classPath = Reflect.getMetadata('basePath', controllerInstance.constructor.prototype) || '';
      const basePath = classPath.startsWith('/') ? classPath : `/${classPath}`;
      const router = Router();

      /**
       * Retrieve shield middleware if present
       */
      const shieldMiddleware = getShieldMiddlewares(Controller);

      /**
       * register each controller method
       */
      Object.getOwnPropertyNames(Object.getPrototypeOf(controllerInstance)).forEach((methodName) => {
        if (methodName !== 'constructor') {
          const method = Reflect.getMetadata('method', controllerInstance.constructor.prototype[methodName]);
          const path = Reflect.getMetadata('path', controllerInstance.constructor.prototype[methodName]);
          const middlewareList: Middleware[] =
            Reflect.getMetadata('middleware', controllerInstance.constructor.prototype[methodName]) || [];

          /**
           * Append any present shield middleware into the middlewares list
           */

          if (shieldMiddleware?.length) {
            middlewareList.unshift(...shieldMiddleware);
            shieldMiddleware.forEach((middleware: Middleware) => {
              if (!registeredShields?.includes(middleware.name)) {
                registeredShields.push(middleware.name);
                inAppLogger.info(dolphMessages.middlewareMessages('Shield', middleware.name));
              }
            });
          }

          if (method && path) {
            const fullPath = normalizePath(basePath + path);

            const handler = async (req: DRequest, res: DResponse, next: DNextFunc) => {
              try {
                // Apply middleware
                for (const middleware of middlewareList) {
                  await new Promise<void>((resolve, reject) => {
                    middleware(req, res, (err?: any) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve();
                      }
                    });
                  });
                }

                // Invoke the controller method
                await controllerInstance.constructor.prototype[methodName](req, res, next);
              } catch (error) {
                next(error);
              }
            };

            // parse the handler function together with full path to the express router object
            router[method](fullPath, handler);
            inAppLogger.info(dolphMessages.routeMessages(methodName, method, fullPath));
          } else {
            logger.error(clc.red(`Missing metadata for method ${methodName} in controller ${Controller.name}`));
          }
        }
      });
      registeredShields.length = 0;

      // register the router object in the express engine
      engine.use('/', router);
    } catch (e) {
      logger.error(clc.red(`Error initializing controller ${Controller.name}: ${e.message}`));
    }
  });
};

// used to increment the limit of listeners for express engine
const incrementHandlers = () => {
  process.setMaxListeners(15);
};

// initializes middlewares used by dolphjs
const initializeMiddlewares = ({ jsonLimit }) => {
  if (env === 'development') {
    engine.use(successHandler);
    engine.use(morganErrorHandler);
  }

  engine.use(express.json({ limit: jsonLimit }));
  engine.use(express.urlencoded({ extended: true }));
  engine.use(helmet());
  engine.use(cookieParser());
  xss('<script>alert("xss");</script>');
};

// registers middlewares defined by user
const initExternalMiddlewares = (middlewares: DRequestHandler[]) => {
  if (middlewares?.length) {
    middlewares.forEach((middleware) => {
      engine.use(middleware);
    });
  }
};

// default not found endpoint
const initNotFoundError = () => {
  engine.use('/', (req: DRequest, res: DResponse) => {
    ErrorResponse({ res, status: 404, body: { message: 'this endpoint does not exist' } });
  });
};

// loads configs from env
const initializeConfigLoader = () => {
  configLoader();
};

// initializes error handlers and converters
const initializeErrorHandlers = () => {
  engine.use(errorConverter);
  engine.use(errorHandler);
};

// exist handler
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.error(clc.red(DolphErrors.serverClosed));
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  logger.error(clc.red(error));
  exitHandler();
};

const initClosureHandler = () => {
  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    logger.error(clc.red(DolphErrors.sigtermReceived));
    if (server) {
      server.close();
    }
  });
};

/**
 * The main engine for the dolph framework
 *
 *
 * @version 1.2.0
 */
class DolphFactoryClass<T extends DolphControllerHandler<Dolph>> {
  private routes = [];
  private controllers = [];

  port: dolphPort = 3030;
  env = process.env.NODE_ENV || 'development';
  configs: DolphConfig;
  externalMiddlewares: RequestHandler[];
  jsonLimit = '30mb';
  private dolph: typeof engine;

  constructor(routes: Array<{ new (): any } | { path?: string; router: Router }> = [], middlewares?: RequestHandler[]) {
    /**
     * Start dolphjs initialization time
     */
    const startTime = process.hrtime();

    routes.forEach((item) => {
      if ('router' in item) {
        this.routes.push(item);
      } else {
        if (!this.controllers.some((c) => c === item)) {
          this.controllers.push(item);
        }
      }

      /**
       * Uncomment this line of code if the controllers are duplicated
       */
      // this.controllers = Array.from(new Set(this.controllers));
    });

    this.externalMiddlewares = middlewares;
    this.extractControllersFromComponent();
    this.readConfigFile();
    this.intiDolphEngine(startTime);
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

      const config: DolphConfig = yaml.load(configContents);
      this.configs = config;

      if (config.port) {
        this.changePort((config.port = typeof 'string' ? +config.port : config.port));
      }

      if (config.env?.length) {
        this.env = config.env;
      }

      if (config.jsonLimit?.length) {
        if (!config.jsonLimit.includes('mb')) {
          inAppLogger.warn(
            clc.yellow(
              "jsonLimit value in `dolph_config` file must be in format 'number + mb' e.g '20mb'. using default value of '30mb' ",
            ),
          );
        } else {
          this.jsonLimit = config.jsonLimit;
        }
      } else {
        inAppLogger.warn(
          clc.yellow("jsonLimit value should be added to `dolph_config` file else default value of '50mb' would be used"),
        );
      }

      if (this.configs.database?.mongo?.url.length > 1) {
        if (this.configs.database.mongo.url === 'sensitive') {
          if (!configs.MONGO_URL.length) {
            logger.error('cannot find `MONGO_URL` in the projects `.env` file');
          }
          this.configs.database.mongo.url = configs.MONGO_URL;
        }
        autoInitMongo(this.configs.database.mongo);
      }

      if (config.middlewares) {
        if (config.middlewares.cors.activate) {
          const { optionsSuccessStatus, allowedHeaders, credentials, exposedHeaders, maxAge, origin, preflightContinue } =
            config.middlewares.cors;
          this.enableCors({
            optionsSuccessStatus,
            allowedHeaders,
            exposedHeaders,
            credentials,
            maxAge,
            origin: origin || '*',
            preflightContinue,
          });
        }
      }
    } catch (e) {
      logger.error(clc.red(DolphErrors.noDolphConfigFile));
      throw e;
    }
    // console.log(config);
  }

  private changePort(port: dolphPort) {
    this.port = port;
  }

  public middlewares(middlewares?: RequestHandler[]) {
    initExternalMiddlewares(middlewares);
  }

  private intiDolphEngine(startTime: [number, number]) {
    this.dolph = engine;
    initializeConfigLoader();
    incrementHandlers();
    initializeMiddlewares({ jsonLimit: this.jsonLimit });
    initExternalMiddlewares(this.externalMiddlewares || []);
    initializeRoutes(this.routes);
    initializeControllersAsRouter(this.controllers);
    initializeErrorHandlers();
    initNotFoundError();

    port = +this.port;
    env = this.env;

    /**
     * End the time recording and obtain duration
     */
    const endTime = process.hrtime(startTime);

    const durationInMilliseconds = Math.round(endTime[0] * 1000 + endTime[1] / 1e6);

    logger.info(`${clc.blueBright('initialized application in')} ${clc.white(` ${durationInMilliseconds}ms`)}`);
  }

  public enableCors(options?: CorsOptions) {
    enableCorsFunc(options || { origin: '*', methods: ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'] });
  }

  public engine = () => this.dolph;

  /**
   * Initializes and returns the dolphjs engine
   */
  public start() {
    server = this.dolph.listen(port, () => {
      logger.info(
        clc.blueBright(`DOLPH APP RUNNING ON PORT ${clc.white(`${this.port}`)} IN ${this.env.toUpperCase()} MODE`),
      );
    });
    // if (this.configs.database?.mysql?.host.length > 1) {
    //   autoInitMySql(
    //     this.configs.database.mysql.database,
    //     this.configs.database.mysql.user,
    //     this.configs.database.mysql.pass,
    //     this.configs.database.mysql.host,
    //   );
    // }

    initClosureHandler();
    return server;
  }
}

export { DolphFactoryClass as DolphFactory };
