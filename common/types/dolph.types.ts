import { DolphConstructor } from '../interfaces';

export type DolphDbs = 'mongo' | 'postgre' | 'mysql' | 'sqllite' | 'maria' | 'cassandra';
export type DolphMiddlewareOption = 'activate' | 'deactivate';

export type DolphServiceMapping<T> = {
  serviceName: keyof T;
  serviceHandler: DolphConstructor<T>;
};
