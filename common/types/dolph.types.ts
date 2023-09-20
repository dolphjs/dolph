import { DolphConstructor } from '..';

export type DolphDbs = 'mongo' | 'postgre' | 'mysql' | 'sqllite' | 'maria' | 'cassandra';
export type DolphMiddlewareOption = {
  activate?: boolean | undefined;
  origin?: string | undefined;
  allowedHeaders?: string[] | undefined | null;
  maxAge?: number | undefined;
  exposedHeaders?: string[] | null | undefined;
  credentials?: boolean | undefined;
  preflightContinue?: boolean | undefined;
  optionsSuccessStatus: number | undefined;
};

export type DolphServiceMapping<T> = {
  serviceName: keyof T;
  serviceHandler: DolphConstructor<T>;
};

export type Dolph = string;
