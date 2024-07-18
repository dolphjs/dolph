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

export type DolphMiddlewareHelmetOption = {
  activate: boolean;
  contentSecurityPolicy?: {
    directives?: {
      defaultSrc?: string[];
      scriptSrc?: string[];
    };
  };
  expectCt?: {
    enforce?: boolean;
    maxAge?: number;
  };
  featurePolicy?: {
    features?: {
      fullscreen?: string[];
      vibrate?: string[];
    };
  };
  referrerPolicy?: {
    policy?: string;
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
  };
  crossOriginEmbedderPolicy?: {
    policy?: string;
  };
  crossOriginOpenerPolicy?: {
    policy?: string;
  };
};

export type DolphServiceMapping<T> = {
  serviceName: keyof T;
  serviceHandler: DolphConstructor<T>;
};

export type Dolph = string;
