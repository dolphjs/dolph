import { DolphDbs, DolphMiddlewareOption, dolphPort } from '..';
import { MongooseConfig } from '.';

export interface DolphConfig {
  database?: DolphConfigDbOption;
  middlewares?: DolphConfigMiddlewares;
  port?: dolphPort;
  routing?: DolphConfigRouting;
}

export interface DolphConfigDbOption {
  mongo: MongooseConfig;
  mysql: MySqlConfig;
}

export interface MySqlConfig {
  host: string;
  database: string;
  user: string;
  pass?: string | null;
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
