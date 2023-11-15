import { RequestHandler, Router } from 'express';
import Dolph from '@dolphjs/core/lib/Dolph';
import { CorsOptions } from 'cors';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import * as d from 'dotenv';
import cors from 'cors';
import clc from 'cli-color';
import { DolphConfig, TryCatchAsyncDec, dolphPort } from '../common';
import { logger } from '../utilities';
import { autoInitMongo } from '../packages';
import { DolphErrors } from '../common/constants';
d.config();

/**
 * The main engine for the dolph framework
 *
 * Uses the dolphjs library under the hood and acts like a wrapper
 *
 * @version 1.0.6
 */
class DolphFactoryClass {
  routes = [];
  port: dolphPort = 3030;
  env = process.env.NODE_ENV || 'development';
  configs: DolphConfig;
  externalMiddlewares: RequestHandler[];
  private dolph: Dolph;
  constructor(routes: Array<{ path?: string; router: Router }>, middlewares?: RequestHandler[]) {
    this.routes = routes;
    this.externalMiddlewares = middlewares;
    this.intiDolphEngine();
    this.readConfigFile();
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

      if (this.configs.database?.mongo?.url.length > 1) {
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
    this.dolph.initExternalMiddleWares(middlewares);
  }

  private intiDolphEngine() {
    const dolph = new Dolph(this.routes, this.port, this.env, this.externalMiddlewares || []);
    dolph.app.use(cors({ origin: '*' })); // TODO: fix this error
    this.dolph = dolph;
  }

  public enableCors(options?: CorsOptions) {
    return options;
  }

  public engine = () => this.dolph.app;

  /**
   * Initializes and returns the dolphjs engine
   */
  public start() {
    const server = this.dolph.app.listen(this.port, () => {
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
    return server;
  }
}

export { DolphFactoryClass as DolphFactory };
