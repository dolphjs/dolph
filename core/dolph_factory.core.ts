import { RequestHandler, Router } from 'express';
import Dolph from '@dolphjs/core/lib/Dolph';
import { CorsOptions } from 'cors';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import * as d from 'dotenv';
import clc from 'cli-color';
import { DolphConfig, TryCatchAsyncDec, dolphPort } from '../common';
import { logger } from '../utilities';
import { autoInitMongo } from '../packages';
d.config();

/**
 * The main engine for the dolph framework
 *
 * Uses the dolphjs library under the hood and acts like a wrapper
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

  @TryCatchAsyncDec
  private readConfigFile() {
    const configContents = readFileSync('dolph_config.yaml', 'utf8');

    const config: DolphConfig = yaml.load(configContents);
    this.configs = config;

    if (!config) return;

    if (config.port) {
      this.changePort((config.port = typeof 'string' ? +config.port : config.port));
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
          origin,
          preflightContinue,
        });
      }
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
    this.dolph = dolph;
  }

  public enableCors(options?: CorsOptions) {
    this.dolph.enableCors(options || { origin: '*' });
  }

  public engine = () => this.dolph.app;

  public start() {
    const server = this.dolph.app.listen(this.port, () => {
      logger.info(
        clc.blueBright(`DOLPH APP RUNNING ON PORT ${clc.white(`${this.port}`)} IN ${this.env.toUpperCase()} MODE`),
      );
    });
    if (this.configs.database?.mongo?.url.length > 1) {
      autoInitMongo(this.configs.database.mongo);
    }
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
