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
  TryCatchAsyncDec,
  dolphPort,
} from '../common';
import { logger } from '../utilities';
import { autoInitMongo } from '../packages';
import { DolphErrors } from '../common/constants';
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
import { DolphControllerHandler } from 'classes';

const engine = express();

// declare core variables
let env = configs.NODE_ENV;
let port = configs.PORT;
let server: Server<typeof IncomingMessage, typeof ServerResponse>;

// function add cors middleware to express
const enableCorsFunc = (corsOptions: CorsOptions) => {
  engine.use(cors(corsOptions));
};

// responsible for registering api routes
const initializaRoutes = (routes: Array<{ path?: string; router: import('express').Router }>) => {
  routes.forEach((route) => {
    engine.use('/', route.router);
  });
};

const initializeControllersAsRouter = <T extends Dolph>(controllers: Array<{ new (): DolphControllerHandler<T> }>) => {
  controllers.forEach((Controller) => {
    const controllerInstance = new Controller();
    const classPath = Reflect.getMetadata('basePath', controllerInstance) || '';
    const basePath = classPath.startsWith('/') ? classPath : `/${classPath}`;
    const router = Router();

    // register each controller method
    Object.getOwnPropertyNames(Object.getPrototypeOf(controllerInstance)).forEach((methodName) => {
      const method = Reflect.getMetadata('method', controllerInstance[methodName]);
      const path = Reflect.getMetadata('path', controllerInstance[methodName]);

      if (method && path) {
        const fullPath = normalizePath(basePath + path);
        console.log('-----factory', fullPath);
        // const handler = controllerInstance[methodName].bind(controllerInstance);
        // switch (method) {
        //   case 'get':
        //     engine.get(fullPath, handler);
        //   case 'post':
        //     engine.post(fullPath, handler);
        //   case 'patch':
        //     engine.patch(fullPath, handler);
        //   case 'put':
        //     engine.put(fullPath, handler);
        //   case 'delete':
        //     engine.delete(fullPath, handler);
        //   default:
        //     engine.use(fullPath, handler);
        // }
        const handler = (req: DRequest, res: DResponse, next: DNextFunc) => controllerInstance[methodName](req, res, next);
        router[method](fullPath, handler);
      }
    });
    engine.use(basePath, router);
  });
};

const incrementHandlers = () => {
  process.setMaxListeners(15);
};

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

const initNotFoundError = () => {
  engine.use('/', (req: DRequest, res: DResponse) => {
    ErrorResponse({ res, status: 404, body: { message: 'end-point not found' } });
  });
};

// loads configs from env
const initializeConfigLoader = () => {
  configLoader();
};

const initializeErrorHandlers = () => {
  engine.use(errorConverter);
  engine.use(errorHandler);
};

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
 * @version 1.1.0
 */
class DolphFactoryClass<T extends DolphControllerHandler<Dolph>> {
  routes = [];
  // controllers = Array<{
  //   method: string;
  //   path: string;
  //   handler: (req: Request, res: Response, next: NextFunction) => void;
  // }> = [];
  controllers = [];

  port: dolphPort = 3030;
  env = process.env.NODE_ENV || 'development';
  configs: DolphConfig;
  externalMiddlewares: RequestHandler[];
  jsonLimit = '50mb';
  private dolph: typeof engine;
  constructor(routes: Array<{ path?: string; router: Router }> | Array<{ new (): T }>, middlewares?: RequestHandler[]) {
    if (
      Array.isArray(routes) &&
      routes.every((item) => typeof item === 'function' && item.prototype instanceof DolphControllerHandler)
    ) {
      this.controllers = routes as Array<{ new (): T }>;
    } else {
      this.routes = routes as Array<{ path?: string; router: Router }>;
    }

    this.externalMiddlewares = middlewares;
    this.readConfigFile();
    this.intiDolphEngine();
  }

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
          logger.warn(
            clc.yellow(
              "jsonLimit value in `dolph_config` file must be in format 'number + mb' e.g '20mb'. using default value of '50mb' ",
            ),
          );
        } else {
          this.jsonLimit = config.jsonLimit;
        }
      } else {
        logger.warn(
          clc.yellow("jsonLimit value should be added to `dolph_config` file else default value of '50mb' would be used "),
        );
      }

      if (this.configs.database?.mongo?.url.length > 1) {
        if (this.configs.database.mongo.url === 'sensitive') {
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

  private intiDolphEngine() {
    this.dolph = engine;
    initializeConfigLoader();
    incrementHandlers();
    initializeMiddlewares({ jsonLimit: this.jsonLimit });
    initExternalMiddlewares(this.externalMiddlewares || []);
    initializaRoutes(this.routes);
    initializeControllersAsRouter(this.controllers);
    initializeErrorHandlers();
    initNotFoundError();

    port = +this.port;
    env = this.env;
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
