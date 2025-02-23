import { DolphMiddlewareOption, dolphEnv, dolphPort } from '..';
import { IPayload, MongooseConfig } from '.';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { FileInfo, UploadConfig } from '../types/dolph_uploader.type';

export interface DolphConfig {
    database?: DolphConfigDbOption;
    middlewares?: DolphConfigMiddlewares;
    port?: dolphPort;
    routing?: DolphConfigRouting;
    env?: dolphEnv;
    jsonLimit?: string;
    globalExceptionFilter?: boolean;
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

export type DRequest = Omit<Request, 'file' | 'files'> &
    IncomingMessage & {
        /**
         * stores the value of token payload
         */
        payload?: IPayload;
        body?: Record<string, any>;
        file?: FileInfo;
        files?: FileInfo[] | Record<string, FileInfo[]>;
        uploadConfig?: UploadConfig;
    };

export type DResponse<T = any> = Response &
    ServerResponse & {
        body?: T;
    };

export interface DRequestHandler extends RequestHandler {}

export type DNextFunc = NextFunction & {};

export interface DRouter extends Router {}

export interface OtherParams {
    passportConfigs?: passportConfigs;
}

export interface passportConfigs {
    passportStrategy?: any;
    passportSerializer?: any;
}
