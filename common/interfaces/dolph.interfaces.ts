import { DolphDbs, DolphMiddlewareOption, dolphEnv, dolphPort } from '..';
import { IPayload, MongooseConfig } from '.';
import { NextFunction, Request, RequestHandler, Response } from 'express';

export interface DolphConfig {
  database?: DolphConfigDbOption;
  middlewares?: DolphConfigMiddlewares;
  port?: dolphPort;
  routing?: DolphConfigRouting;
  env?: dolphEnv;
  jsonLimit?: string;
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

export interface DRequest extends Request {
  /**
   * stores the value of token payload
   */
  payload?: IPayload;
}

export interface DResponse<T = any> extends Response {
  body?: T;
}
export interface DRequestHandler extends RequestHandler {}

export interface DNextFunc extends NextFunction {}
