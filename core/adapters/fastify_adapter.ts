import type { Server, ServerResponse } from 'http';
import { resolve } from 'path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { serialize } from 'cookie';
import { contentType as resolveContentType } from 'mime-types';
import { parse as parseQuery } from 'qs';
import { DRequest, DResponse } from '../../common/interfaces';
import { loadOptionalDriver } from '../../utilities/load_optional_driver.utilities';
import { AdapterErrorHandler, AdapterHandler, HttpAdapter, HttpMethod, ViewOptions } from './http_adapter';

type Next = (error?: unknown) => void;

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const URLENCODED_BODY_LIMIT = 100 * 1024;
const SIZE_UNITS: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

const toBytes = (limit: string) => {
    const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(limit.trim());

    if (!match) throw new Error(`Invalid jsonLimit '${limit}'. Use a size like '5mb'.`);

    return Math.floor(Number(match[1]) * SIZE_UNITS[(match[2] ?? 'b').toLowerCase()]);
};

/** Runs `(req, res, next)` handlers in order, the way Express does. */
const runChain = (handlers: AdapterHandler[], req: unknown, res: unknown, done: Next) => {
    let index = 0;

    const next: Next = (error) => {
        if (error) return done(error);

        const handler = handlers[index++];
        if (!handler) return done();

        try {
            const result = handler(req, res, next) as PromiseLike<unknown> | undefined;

            if (typeof result?.then === 'function') {
                Promise.resolve(result).catch(next);
            }
        } catch (handlerError) {
            next(handlerError);
        }
    };

    next();
};

const cookieHeader = (name: string, value: string, options: Record<string, any> = {}) => {
    const { maxAge, ...rest } = options;

    // Express takes maxAge in milliseconds, and the header is in seconds.
    return serialize(name, value, { path: '/', ...rest, ...(maxAge !== undefined && { maxAge: Math.floor(maxAge / 1000) }) });
};

/** The `res` handlers receive. Wraps Fastify's reply so the same code runs on both servers. */
class FastifyResponse implements DResponse {
    readonly raw: ServerResponse;

    constructor(private readonly reply: FastifyReply) {
        this.raw = reply.raw;
    }

    get locals(): Record<string, any> {
        const raw = this.raw as ServerResponse & { locals?: Record<string, any> };
        raw.locals ??= {};
        return raw.locals;
    }

    get statusCode() {
        return this.reply.statusCode;
    }

    set statusCode(code: number) {
        this.reply.code(code);
    }

    get headersSent() {
        return this.reply.sent;
    }

    status(code: number) {
        this.reply.code(code);
        return this;
    }

    json(body?: unknown) {
        if (body !== null && typeof body === 'object') {
            this.reply.send(body);
        } else {
            this.reply.header('content-type', JSON_CONTENT_TYPE).send(JSON.stringify(body));
        }
        return this;
    }

    send(body?: unknown) {
        // Fastify would call a string text/plain. Express treats it as HTML, which
        // is what makes res.send() the way to return a page.
        if (typeof body === 'string' && !this.reply.hasHeader('content-type')) {
            this.reply.type('text/html; charset=utf-8');
        }
        this.reply.send(body);
        return this;
    }

    end(body?: unknown) {
        this.reply.send(body);
        return this;
    }

    set(name: string, value: string | string[]) {
        this.reply.header(name, value);
        return this;
    }

    setHeader(name: string, value: string | string[]) {
        return this.set(name, value);
    }

    get(name: string) {
        return this.reply.getHeader(name);
    }

    getHeader(name: string) {
        return this.get(name);
    }

    removeHeader(name: string) {
        this.reply.removeHeader(name);
    }

    type(contentType: string) {
        this.reply.type(resolveContentType(contentType) || contentType);
        return this;
    }

    contentType(contentType: string) {
        return this.type(contentType);
    }

    cookie(name: string, value: string, options?: Record<string, any>) {
        this.reply.header('set-cookie', cookieHeader(name, value, options));
        return this;
    }

    clearCookie(name: string, options?: Record<string, any>) {
        return this.cookie(name, '', { ...options, expires: new Date(1) });
    }

    redirect(url: string) {
        this.reply.redirect(url);
    }

    render(view: string, data?: object) {
        (this.reply as FastifyReply & { view: (view: string, data?: object) => unknown }).view(view, data);
    }

    on(event: string, listener: () => void) {
        this.raw.on(event, listener);
        return this;
    }

    once(event: string, listener: () => void) {
        this.raw.once(event, listener);
        return this;
    }
}

/**
 * Middie hands middleware the Node objects, not Fastify's. Middleware written for
 * Dolph or Express calls these on `res`, so they have to exist there too.
 */
const addResponseHelpers: AdapterHandler = (req, res: ServerResponse & Record<string, any>, next) => {
    req.get = (name: string) => req.headers[name.toLowerCase()];
    res.locals ??= {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.set = (name: string, value: string | string[]) => {
        res.setHeader(name, value);
        return res;
    };
    res.get = (name: string) => res.getHeader(name);
    res.type = (contentType: string) => res.set('content-type', resolveContentType(contentType) || contentType);
    res.json = (body: unknown) => {
        if (!res.hasHeader('content-type')) res.setHeader('content-type', JSON_CONTENT_TYPE);
        res.end(JSON.stringify(body));
        return res;
    };
    res.send = (body: unknown) => {
        if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) return res.json(body);
        if (!res.hasHeader('content-type')) res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(body);
        return res;
    };
    res.cookie = (name: string, value: string, options?: Record<string, any>) => {
        res.appendHeader('set-cookie', cookieHeader(name, value, options));
        return res;
    };
    next();
};

// Kept on the Node request so that whichever layer sets one, the handler sees it.
const SHARED_REQUEST_FIELDS = ['payload', 'cookies', 'session', 'user', 'file', 'files', 'rawBody', 'uploadConfig'];

export class FastifyAdapter implements HttpAdapter {
    readonly name = 'fastify';
    readonly server: Server;

    private readonly app: FastifyInstance;
    private readonly securityMiddlewares: AdapterHandler[] = [];
    private readonly pendingMiddlewares: AdapterHandler[] = [addResponseHelpers];
    private errorHandlers: AdapterErrorHandler[] = [];
    private notFoundHandler?: AdapterHandler;
    private middieLoaded = false;
    private ready?: Promise<unknown>;

    constructor() {
        const fastify = loadOptionalDriver('fastify', () => require('fastify')) as typeof import('fastify').default;

        this.app = fastify({
            logger: false,
            routerOptions: {
                caseSensitive: false,
                ignoreTrailingSlash: true,
                ignoreDuplicateSlashes: true,
                querystringParser: (query) => parseQuery(query) as Record<string, string>,
            },
        });
        this.server = this.app.server;

        this.decorateRequests();
        this.runSecurityMiddlewares();
        this.loadMiddie();

        this.app.setErrorHandler((error, request, reply) => this.handleError(error, request, reply));
        this.app.setNotFoundHandler((request, reply) => this.handleNotFound(request, reply));
    }

    private decorateRequests() {
        this.app.decorateRequest('get', function (this: FastifyRequest, name: string) {
            return this.headers[name.toLowerCase()];
        });

        SHARED_REQUEST_FIELDS.forEach((field) => {
            this.app.decorateRequest(field, {
                getter(this: FastifyRequest) {
                    return (this.raw as unknown as Record<string, unknown>)[field];
                },
                setter(this: FastifyRequest, value: unknown) {
                    (this.raw as unknown as Record<string, unknown>)[field] = value;
                },
            });
        });

        this.app.decorateReply('dolphResponse', null);
    }

    private response(reply: FastifyReply): FastifyResponse {
        const holder = reply as FastifyReply & { dolphResponse: FastifyResponse | null };
        holder.dolphResponse ??= new FastifyResponse(reply);
        return holder.dolphResponse;
    }

    /** Runs before body parsing, so these headers reach even a malformed-body 400. */
    private runSecurityMiddlewares() {
        this.app.addHook('onRequest', (request, reply, done) => {
            if (!this.securityMiddlewares.length) return done();

            let finished = false;

            // A CORS preflight ends the response without calling next.
            reply.raw.once('finish', () => {
                if (!finished) reply.hijack();
            });

            runChain(this.securityMiddlewares, request.raw, reply.raw, (error) => {
                finished = true;
                done(error as Error | undefined);
            });
        });
    }

    private loadMiddie() {
        const middie = loadOptionalDriver('@fastify/middie', () => require('@fastify/middie'));

        // preHandler, so middleware sees the parsed body as it does on Express.
        this.app.register(middie, { hook: 'preHandler' }).after(() => {
            this.middieLoaded = true;
            this.pendingMiddlewares.splice(0).forEach((middleware) => this.addToMiddie(middleware));
        });
    }

    private addToMiddie(middleware: AdapterHandler) {
        (this.app as FastifyInstance & { use(handler: AdapterHandler): void }).use(middleware);
    }

    private handleError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
        const res = this.response(reply);
        let index = 0;

        const next: Next = (nextError) => {
            const handler = this.errorHandlers[index++];

            if (!handler) {
                reply.code(500).send({ message: 'Internal Server Error' });
                return;
            }

            try {
                handler(nextError ?? error, request, res, next);
            } catch (handlerError) {
                next(handlerError);
            }
        };

        next(error);
    }

    private handleNotFound(request: FastifyRequest, reply: FastifyReply) {
        if (!this.notFoundHandler) {
            reply.code(404).send({ message: 'this endpoint does not exist' });
            return;
        }

        runChain([this.notFoundHandler], request, this.response(reply), (error) => {
            if (error) reply.send(error);
        });
    }

    useSecurity(middleware: AdapterHandler) {
        this.securityMiddlewares.push(middleware);
    }

    useBodyParsers({ jsonLimit }: { jsonLimit: string }) {
        this.app.removeAllContentTypeParsers();

        this.app.addContentTypeParser(
            'application/json',
            { parseAs: 'buffer', bodyLimit: toBytes(jsonLimit) },
            (request, body, done) => {
                (request as unknown as DRequest).rawBody = body as Buffer;

                if ((body as Buffer).length === 0) return done(null, {});

                try {
                    done(null, JSON.parse(body.toString()));
                } catch (error) {
                    done(Object.assign(error as Error, { statusCode: 400 }));
                }
            },
        );

        this.app.addContentTypeParser(
            'application/x-www-form-urlencoded',
            { parseAs: 'string', bodyLimit: URLENCODED_BODY_LIMIT },
            (_request, body, done) => done(null, parseQuery(body as string)),
        );

        // Anything else stays unread on the request stream, for the uploader or a
        // handler to consume. Fastify would otherwise refuse it with a 415.
        this.app.addContentTypeParser('*', (_request, _payload, done) => done(null));
    }

    use(middleware: AdapterHandler) {
        if (this.middieLoaded) {
            this.addToMiddie(middleware);
        } else {
            this.pendingMiddlewares.push(middleware);
        }
    }

    useViews({ engine, assetsPath, viewsDir }: ViewOptions) {
        const view = loadOptionalDriver('@fastify/view', () => require('@fastify/view'));
        const assets = loadOptionalDriver('@fastify/static', () => require('@fastify/static'));
        const templates: Record<string, () => unknown> = {
            ejs: () => require('ejs'),
            pug: () => require('pug'),
            handlebars: () => require('handlebars'),
        };

        this.app.register(view, {
            engine: { [engine]: loadOptionalDriver(engine, templates[engine]) },
            root: resolve(viewsDir),
            viewExt: engine,
        });
        this.app.register(assets, { root: resolve(assetsPath) });
    }

    mountRouter() {
        throw new Error(
            "DolphRouteHandler and Express Routers need `adapter: express`. On Fastify, use @Route controllers.",
        );
    }

    route(method: HttpMethod, path: string, handlers: AdapterHandler[]) {
        this.app.route({
            method: method.toUpperCase() as Uppercase<HttpMethod>,
            url: path || '/',
            handler: (request, reply) => {
                // Express always leaves an object here, and handlers rely on it.
                request.body ??= {};

                runChain(handlers, request, this.response(reply), (error) => {
                    if (error) {
                        reply.send(error);
                    } else {
                        reply.callNotFound();
                    }
                });
            },
        });
    }

    useErrorHandlers(handlers: AdapterErrorHandler[]) {
        this.errorHandlers = handlers;
    }

    useNotFound(handler: AdapterHandler) {
        this.notFoundHandler = handler;
    }

    private whenReady() {
        this.ready ??= Promise.resolve(this.app.ready());
        return this.ready;
    }

    /**
     * Callable like an Express app, so `createServer(dolph.engine())` and supertest work
     * unchanged, and it still exposes the Fastify instance for anything else.
     */
    requestListener() {
        const listener = (req: unknown, res: unknown) => {
            this.whenReady().then(() => this.app.routing(req as never, res as never));
        };

        return new Proxy(listener, {
            get: (target, property, receiver) =>
                property in this.app ? Reflect.get(this.app, property) : Reflect.get(target, property, receiver),
        });
    }

    listen(port: number, host: string, onListening: () => void) {
        this.app.listen({ port, host }, (error) => {
            if (error) {
                this.server.emit('error', error);
                return;
            }
            onListening();
        });
    }
}
