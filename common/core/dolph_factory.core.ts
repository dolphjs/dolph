import { RequestHandler } from 'express';
import * as Dolph from '../../node_modules/@dolphjs/core/lib/Dolph';
import { dolphEnv } from '../types/dolph_env.type';
import { dolphPort } from '../types/dolph_port.type';

abstract class DolphFactoryClass extends Dolph {
  declare env: dolphEnv;
  declare port: dolphPort;
  // protected injectMiddlewares(middlewares: RequestHandler[]): void{
  // this.initExternalMiddleWares(middlewares);
  // }
}

//TODO
class DolphFactory extends DolphFactoryClass {}
export { DolphFactoryClass };
