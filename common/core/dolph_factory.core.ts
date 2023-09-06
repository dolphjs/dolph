import { RequestHandler, Router } from 'express';
import Dolph from '../../node_modules/@dolphjs/core/lib/Dolph';
import { dolphEnv } from '../types/dolph_env.type';
import { dolphPort } from '../types/dolph_port.type';
import { DolphRouteHandler, TryCatchAsyncDec } from '..';
import { CorsOptions } from 'cors';
import { logger } from '../utilities/logger.utilities';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import * as d from 'dotenv';
import clc from 'cli-color';
import { DolphConfig } from '../interfaces';
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
  private dolph: Dolph;
  constructor(routes: Array<{ path?: string; router: Router }>) {
    this.routes = routes;
    this.intiDolphEngine();
    this.readConfigFile();
  }

  @TryCatchAsyncDec
  private readConfigFile() {
    const configContents = readFileSync('dolph_config.yaml', 'utf8');

    const config: DolphConfig = yaml.load(configContents);
    this.configs = config;

    console.log(config);

    if (!config) return;

    if (config.port) {
      this.changePort((config.port = typeof 'string' ? +config.port : config.port));
    }

    if (config.middlewares) {
      if (config.middlewares.cors.activate) {
        this.enableCors();
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
    const dolph = new Dolph(this.routes, this.port, this.env, []);
    this.dolph = dolph;
  }

  public enableCors(options?: CorsOptions) {
    this.dolph.enableCors(options || { origin: '*' });
  }

  public start() {
    const server = this.dolph.app.listen(this.port, () => {
      logger.info(
        clc.blueBright(`DOLPH APP RUNNING ON PORT ${clc.white(`${this.port}`)} IN ${this.env.toUpperCase()} MODE`),
      );
    });
    return server;
  }
}

export { DolphFactoryClass as DolphFactory };
