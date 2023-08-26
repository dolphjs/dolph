import { DolphDbs, DolphMiddlewareOption, dolphPort } from '..';

export interface DolphConfig {
  database?: DolphConfigDbOption;
  middlewares?: DolphConfigMiddlewares;
  port?: dolphPort;
  routing?: DolphConfigRouting;
}

export interface DolphConfigDbOption {
  type?: DolphDbs;
  uri?: string;
}

export interface DolphConfigMiddlewares {
  cors?: DolphMiddlewareOption;
  xss?: DolphMiddlewareOption;
}

export interface DolphConfigRouting {
  base?: string;
}

export interface DolphConstructor<T = any> {
  new (...args: any[]): T;
}
