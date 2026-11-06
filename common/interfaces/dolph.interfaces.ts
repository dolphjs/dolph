import type { HelmetOptions } from 'helmet';
import { DolphMiddlewareOption, dolphEnv, dolphPort } from '..';
import { IPayload, MongooseConfig } from '.';
import type { Router } from 'express';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { FileInfo, UploadConfig } from '../types/dolph_uploader.type';
import { Options as SequelizeOptions } from 'sequelize';
import { DataSourceOptions } from 'typeorm';

export interface DolphConfig {
    database?: DolphConfigDbOption;
    middlewares?: DolphConfigMiddlewares;
    port?: dolphPort;
    routing?: DolphConfigRouting;
    env?: dolphEnv;
    jsonLimit?: string;
    globalExceptionFilter?: boolean;
    /** The HTTP server to run on. Defaults to `express`. */
    adapter?: 'express' | 'fastify';
}

export interface DolphConfigDbOption {
    mongo?: MongooseConfig;
    typeorm?: TypeOrmConfig;
    sequelize?: SqlConfig;
}

export interface SqlConfig {
    dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';
    database: string;
    host?: string;
    user?: string;
    pass?: string | null;
    options?: SequelizeOptions;
}

export interface TypeOrmConfig {
    options: DataSourceOptions;
}

export interface DolphConfigMiddlewares {
    cors?: DolphMiddlewareOption;
    xss?: DolphMiddlewareOption;
    helmet?: boolean | HelmetOptions;
}

export interface DolphConfigRouting {
    base?: string;
}

export interface DolphConstructor<T = any> {
    new (...args: any[]): T;
}

/**
 * The request API that works on every adapter. Reach `req.raw` for the Node request,
 * and declaration-merge this interface to add your own properties.
 */
export interface DRequest {
    method: string;
    url: string;
    originalUrl: string;
    headers: IncomingHttpHeaders;
    params: any;
    query: any;
    body?: any;
    cookies?: any;
    ip?: string;
    hostname?: string;
    protocol?: string;
    /** Reads a header, case-insensitively. */
    get(name: string): string | string[] | undefined;
    /**
     * stores the value of token payload
     */
    payload?: IPayload;
    file?: FileInfo;
    files?: FileInfo[] | Record<string, FileInfo[]>;
    uploadConfig?: UploadConfig;
    /**
     * The raw request body bytes, captured before JSON parsing. Needed
     * for byte-exact HMAC signature verification (webhooks from
     * Paystack, Stripe, GitHub, etc.) — `JSON.stringify(req.body)` is
     * not guaranteed to reproduce the original bytes.
     */
    rawBody?: Buffer;
    /** Set by session middleware. */
    session?: any;
    /** Set by auth middleware. */
    user?: any;
    /** The Node request underneath, when the server wraps it. */
    raw?: IncomingMessage;
}

/**
 * The response API that works on every adapter. Reach `res.raw` for the Node response.
 */
export interface DResponse<T = any> {
    statusCode: number;
    headersSent: boolean;
    locals: Record<string, any>;
    status(code: number): this;
    json(body?: T): this;
    send(body?: T): this;
    end(body?: unknown): this;
    set(name: string, value: string | string[]): this;
    get(name: string): unknown;
    type(contentType: string): this;
    contentType(contentType: string): this;
    cookie(name: string, value: string, options?: Record<string, any>): this;
    clearCookie(name: string, options?: Record<string, any>): this;
    redirect(url: string): unknown;
    render(view: string, data?: object): unknown;
    /** The Node response underneath, when the server wraps it. */
    raw?: ServerResponse;
}

export type DNextFunc = (error?: unknown) => void;

// Declared through a method so its parameters are bivariant. That's what lets
// middleware written for Express, like cookieParser(), be passed where this is expected.
export type DRequestHandler = {
    handler(req: DRequest, res: DResponse, next: DNextFunc): unknown;
}['handler'];

export type DRouter = Router;

export interface OtherParams {
    passportConfigs?: passportConfigs;
}

export interface passportConfigs {
    passportStrategy?: any;
    passportSerializer?: any;
}
