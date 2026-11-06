import type { Server } from 'http';
import type { MVCEngine } from '../../common';

export type AdapterName = 'express' | 'fastify';
export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

// Middleware is framework code and third-party packages written against either
// server's request type, so nothing narrower holds across adapters.
export type AdapterHandler = (req: any, res: any, next: (error?: unknown) => void) => unknown;
export type AdapterErrorHandler = (error: any, req: any, res: any, next: (error?: unknown) => void) => unknown;

export type ViewOptions = {
    engine: MVCEngine;
    assetsPath: string;
    viewsDir: string;
};

/**
 * Everything DolphFactory needs from an HTTP server. Controllers, services and
 * `(req, res, next)` middleware sit above this and don't change between adapters.
 *
 * Registration order follows the request: security middleware, body parsing,
 * general middleware, routes, then error handling.
 */
export interface HttpAdapter {
    readonly name: AdapterName;
    readonly server: Server;

    /** Runs before body parsing, so a malformed body still gets these headers. */
    useSecurity(middleware: AdapterHandler): void;
    useBodyParsers(options: { jsonLimit: string }): void;
    /** Runs after body parsing and before routes. Can be called after routes are added. */
    use(middleware: AdapterHandler): void;
    useViews(options: ViewOptions): void;

    /** Mounts an Express Router. Only the Express adapter supports this. */
    mountRouter(path: string, router: unknown): void;
    route(method: HttpMethod, path: string, handlers: AdapterHandler[]): void;

    useErrorHandlers(handlers: AdapterErrorHandler[]): void;
    useNotFound(handler: AdapterHandler): void;

    /** A request listener for `createServer()` or supertest. */
    requestListener(): unknown;
    listen(port: number, host: string, onListening: () => void): void;
}
