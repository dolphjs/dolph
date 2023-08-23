import { DolphDbs, DolphMiddlewareOption, dolphPort } from '..';

export interface DolphConfig {
  database?: DolphConfigDbOption;
  middlewares?: DolphConfigMiddlewares;
  port?: dolphPort;
}

export interface DolphConfigDbOption {
  type?: DolphDbs;
  uri?: string;
}

export interface DolphConfigMiddlewares {
  cors?: DolphMiddlewareOption;
  xss?: DolphMiddlewareOption;
}
