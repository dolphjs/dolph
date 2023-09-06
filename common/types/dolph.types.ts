import { DolphConstructor } from '../interfaces';

export type DolphDbs = 'mongo' | 'postgre' | 'mysql' | 'sqllite' | 'maria' | 'cassandra';
export type DolphMiddlewareOption = {
  activate?: Boolean | undefined;
  origin?: string | undefined;
  allowedHeaders?: Array<string> | undefined | null;
  maxAge?: number | undefined;
  exposedHeaders?: Array<string> | null | undefined;
  credentials?: Boolean | undefined;
  preflightContinue?: Boolean | undefined;
  optionsSuccessStatus: number | undefined;
};

export type DolphServiceMapping<T> = {
  serviceName: keyof T;
  serviceHandler: DolphConstructor<T>;
};
