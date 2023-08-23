import { RequestHandler, Router } from 'express';
import Dolph from '../../node_modules/@dolphjs/core/lib/Dolph';
import { dolphEnv } from '../types/dolph_env.type';
import { dolphPort } from '../types/dolph_port.type';
import { DolphRouteHandler } from '..';
import { CorsOptions } from 'cors';
import { logger } from '../utilities/logger.utilities';
import * as d from 'dotenv';
import clc from 'cli-color';
d.config();

class DolphFactoryClass {
  routes = [];
  port: dolphPort = 3030;
  env = process.env.NODE_ENV || 'development';
  private dolph: Dolph;
  constructor(routes: Array<{ path?: string; router: Router }>) {
    this.routes = routes;
    this.intiDolphEngine();
  }

  public changePort(port: dolphPort) {
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
