import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { createReadStream, statSync } from 'fs';
import { extname, join, normalize, resolve as resolvePath } from 'path';
import { serialize } from 'cookie';
import { contentType as resolveContentType } from 'mime-types';
import { parse as parseQuery } from 'qs';
import { DRequest, DResponse } from '../../common/interfaces';
import { parseSize } from '../../utilities/parse_size.utilities';
import { AdapterErrorHandler, AdapterHandler, HttpAdapter, HttpMethod, ViewOptions } from './http_adapter';

type Next = (error?: unknown) => void;

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const URLENCODED_BODY_LIMIT = 100 * 1024;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as PromiseLike<unknown>).then === 'function';

/** Shared result for chains that finish without allocating a fresh object. */
const CHAIN_DONE: ChainResult = Object.freeze({ done: true });

/**
 * Scratch buffers for route matching. `matchRoute` is fully synchronous and
 * runs no user code, so one request can never observe another's segments.
 * Reusing them avoids two array allocations per request.
 */
const requestSegments: string[] = [];
const requestSegmentsLower: string[] = [];

const cookieHeader = (name: string, value: string, options: Record<string, any> = {}) => {
    const { maxAge, ...rest } = options;

    // Express takes maxAge in milliseconds, and the header is in seconds.
    return serialize(name, value, { path: '/', ...rest, ...(maxAge !== undefined && { maxAge: Math.floor(maxAge / 1000) }) });
};

interface ChainResult {
    done: boolean;
    error?: unknown;
}

interface RouteEntry {
    method: string;
    /** Path split on `/`, empty segments removed. Params look like `:id`. */
    segments: string[];
    handlers: AdapterHandler[];
}

// ── Shared request/response methods ────────────────────────────────────────
// Assigned by reference onto every req/res instead of allocating closures per
// request. They use `this` the same way Express's own res methods do, so a
// middleware that extracts `const { json } = res` behaves exactly as it would
// on Express.

function reqGet(this: any, name: string) {
    return this.headers[name.toLowerCase()];
}

function resStatus(this: any, code: number) {
    this.statusCode = code;
    return this;
}

function resSet(this: any, name: string, value: string | string[]) {
    this.setHeader(name, value);
    return this;
}

function resGet(this: any, name: string) {
    return this.getHeader(name);
}

function resType(this: any, contentType: string) {
    this.setHeader('content-type', resolveContentType(contentType) || contentType);
    return this;
}

function resJson(this: any, body?: unknown) {
    if (!this.hasHeader('content-type')) this.setHeader('content-type', JSON_CONTENT_TYPE);
    this.end(JSON.stringify(body));
    return this;
}

function resSend(this: any, body?: unknown) {
    if (Buffer.isBuffer(body)) {
        this.end(body);
        return this;
    }
    if (typeof body === 'string') {
        if (!this.hasHeader('content-type')) this.setHeader('content-type', 'text/html; charset=utf-8');
        this.end(body);
        return this;
    }
    // null/undefined end with an empty body; numbers, booleans and objects go
    // through JSON — matching Express (raw.end(42) would throw).
    if (body === null || body === undefined) {
        this.end();
        return this;
    }
    return this.json(body);
}

function resCookie(this: any, name: string, value: string, options?: Record<string, any>) {
    this.appendHeader('set-cookie', cookieHeader(name, value, options));
    return this;
}

function resClearCookie(this: any, name: string, options?: Record<string, any>) {
    return this.cookie(name, '', { ...options, expires: new Date(1) });
}

function resRedirect(this: any, url: string) {
    this.statusCode = 302;
    this.setHeader('location', url);
    this.end();
}

/** Adapter back-reference so `res.render` can stay a shared function. */
const ADAPTER_KEY = Symbol('dolphAdapter');

function resRender(this: any, view: string, data?: object) {
    return this[ADAPTER_KEY].renderView(this, view, data);
}

/**
 * The Dolph engine — DolphJS's own HTTP layer, with no Express and no Fastify
 * underneath. Built on the `http` module, so it runs on Node and on Bun (Bun
 * implements `http`); a Bun-native transport can be swapped in behind this
 * interface later without changing the `adapter: dolph` option.
 *
 * Design goals (vs the Fastify adapter):
 * - Lean per-request pipeline: one route lookup, one middleware chain, direct writes.
 * - Express middleware compatibility: `cors`, `helmet`, `cookie-parser`, `morgan` run
 *   unmodified because they receive the real Node `req`/`res` with Express-like helpers.
 * - Runs on Node and on Bun (Bun implements the `http` module).
 *
 * `mountRouter` refuses Express routers, matching the Fastify adapter's Option-A contract.
 */
export class DolphAdapter implements HttpAdapter {
    readonly name = 'dolph';
    readonly server: Server;

    private readonly securityMiddlewares: AdapterHandler[] = [];
    private readonly middlewares: AdapterHandler[] = [];
    private readonly errorHandlers: AdapterErrorHandler[] = [];
    private notFoundHandler?: AdapterHandler;
    /** `[notFoundHandler]`, built once in useNotFound — avoids a per-miss array. */
    private notFoundChain: AdapterHandler[] = [];

    /**
     * verb → segmentCount → routes. Two-level so lookup allocates no key
     * string per request (a `METHOD:n` template would), and segment count
     * skips routes of other shapes before any segment is compared.
     */
    private readonly routeGroups = new Map<string, Map<number, RouteEntry[]>>();

    private jsonLimitBytes = parseSize('5mb');
    private viewsConfig?: { engine: string; viewsDir: string };
    private staticRoot?: string;
    /** Express-compatible registry: `engines['.handlebars']`, populated by useViews. */
    private readonly engines: Record<string, unknown> = {};

    constructor() {
        this.server = createServer((req, res) => {
            void this.handle(req, res);
        });
    }

    useSecurity(middleware: AdapterHandler) {
        this.securityMiddlewares.push(middleware);
    }

    useBodyParsers({ jsonLimit }: { jsonLimit: string }) {
        this.jsonLimitBytes = parseSize(jsonLimit);
    }

    use(middleware: AdapterHandler) {
        this.middlewares.push(middleware);
    }

    useViews({ engine, assetsPath, viewsDir }: ViewOptions) {
        this.viewsConfig = { engine, viewsDir };
        this.staticRoot = assetsPath;

        // Loaded here so apps not using views never pay to import the engine —
        // and so `engine().engines['.handlebars']` matches Express introspection.
        if (engine === 'handlebars') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { engine: handlebarsEngine } = require('express-handlebars');
            this.engines['.handlebars'] = handlebarsEngine({ defaultLayout: false });
        } else if (engine === 'ejs') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            this.engines['.ejs'] = require('ejs');
        } else if (engine === 'pug') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            this.engines['.pug'] = require('pug');
        }
    }

    mountRouter() {
        throw new Error(
            "DolphRouteHandler and Express Routers need `adapter: express`. On the Dolph engine, use @Route controllers.",
        );
    }

    route(method: HttpMethod, path: string, handlers: AdapterHandler[]) {
        const rawSegments = path.split('/').filter(Boolean);
        // Lowercase static segments once at registration, not per request.
        // Param segments (`:id`) keep their original name for the capture key.
        const segments = rawSegments.map((segment) =>
            segment.charCodeAt(0) === 58 /* : */ ? segment : segment.toLowerCase(),
        );
        const entry: RouteEntry = { method, segments, handlers };

        // Dolph registers lowercase verbs ('get'), Node reports uppercase ('GET').
        // Normalise to uppercase here so matchRoute's lookup always finds the group.
        const verb = method.toUpperCase();
        let byCount = this.routeGroups.get(verb);
        if (!byCount) {
            byCount = new Map();
            this.routeGroups.set(verb, byCount);
        }
        const group = byCount.get(segments.length);
        if (group) group.push(entry);
        else byCount.set(segments.length, [entry]);
    }

    useErrorHandlers(handlers: AdapterErrorHandler[]) {
        this.errorHandlers.push(...handlers);
    }

    useNotFound(handler: AdapterHandler) {
        this.notFoundHandler = handler;
        // Pre-built so the 404 path allocates no array per miss.
        this.notFoundChain = [handler];
    }

    requestListener() {
        const listener = (req: IncomingMessage, res: ServerResponse) => {
            void this.handle(req, res);
        };

        // Carry the engine registry on the listener so `dolph.engine().engines`
        // works the same way it does on Express.
        return Object.assign(listener, { engines: this.engines });
    }

    listen(port: number, host: string) {
        return new Promise<void>((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(port, host, () => {
                this.server.off('error', reject);
                resolve();
            });
        });
    }

    close() {
        return new Promise<void>((resolve, reject) => {
            if (!this.server.listening) {
                resolve();
                return;
            }

            this.server.close((error) => (error ? reject(error) : resolve()));
        });
    }

    // ── Request pipeline ────────────────────────────────────────────────────

    private async handle(rawReq: IncomingMessage, rawRes: ServerResponse) {
        const req = this.prepareRequest(rawReq);
        const res = this.prepareResponse(rawRes);

        try {
            // 1. Security middlewares run before body parsing so CORS/helmet
            //    headers reach even a malformed-body 400.
            const security = await this.runChain(this.securityMiddlewares, req, res);
            if (security.error) throw security.error;
            if (!security.done) return;

            // 2. Body parsing (JSON / urlencoded) before general middlewares.
            //    Bodyless requests (GET) resolve synchronously — no Promise.
            const bodyWork = this.parseBody(req, rawReq);
            if (bodyWork) await bodyWork;

            // 3. General middlewares (cookie-parser, app-level auth, ...).
            const mw = await this.runChain(this.middlewares, req, res);
            if (mw.error) throw mw.error;
            if (!mw.done) return;

            // 4. Static assets, when views are configured (Express serves them
            //    before routes; a missing file falls through to routing).
            if (this.staticRoot && (rawReq.method === 'GET' || rawReq.method === 'HEAD')) {
                if (this.tryServeStatic(rawReq, rawRes)) return;
            }

            // 5. Route match → handlers. No match or fall-through → 404.
            const handlers = this.matchRoute(rawReq.method || 'GET', rawReq.url || '/', req);
            if (handlers) {
                const route = await this.runChain(handlers, req, res);
                if (route.error) throw route.error;
                if (route.done && !rawRes.writableEnded) {
                    const fallthrough = this.runNotFound(req, res);
                    if (fallthrough) await fallthrough;
                }
            } else {
                const missed = this.runNotFound(req, res);
                if (missed) await missed;
            }
        } catch (error) {
            await this.runErrorHandlers(error, req, res);
        }
    }

    /**
     * Runs `(req, res, next)` handlers in order, the way Express does.
     *
     * The hot path is fully synchronous: a handler that calls `next()` inline
     * keeps the loop running, and one that ends the response settles the chain
     * immediately — no Promise and no `finish`/`close` listeners are created.
     * A handler that takes control asynchronously (returns a promise, or will
     * call `next()` from a callback) arms listeners and returns a Promise.
     *
     * Returns `{ done: true }` when the chain exhausts without a response,
     * `{ done: false }` when a handler ends the response, or `{ error }`.
     */
    private runChain(
        handlers: AdapterHandler[],
        req: DRequest,
        res: DResponse,
    ): ChainResult | Promise<ChainResult> {
        if (!handlers.length) return CHAIN_DONE;

        const rawRes = res.raw!;
        let index = 0;
        let settled = false;
        let armed = false;
        let syncResult: ChainResult | undefined;
        let resolvePromise: ((result: ChainResult) => void) | undefined;
        // Tracks next() called while a handler is still on the stack.
        let handlerRunning = false;
        let recordedNext = false;
        let recordedError: unknown;

        const finish = (result: ChainResult) => {
            if (settled) return;
            settled = true;
            if (armed) {
                rawRes.off('finish', onResponseFinished);
                rawRes.off('close', onResponseFinished);
            }
            if (resolvePromise) resolvePromise(result);
            else syncResult = result;
        };

        // A handler may end the response without calling next() (CORS preflight
        // does this) — the chain is over either way.
        const onResponseFinished = () => finish({ done: false });

        const next: Next = (error) => {
            if (settled) return;
            if (handlerRunning) {
                // Synchronous next() — record it and let the loop below continue
                // once the handler returns, so we never recurse through handlers.
                recordedNext = true;
                recordedError = error;
                return;
            }
            // Async next() from a callback or an awaited handler.
            runLoop(error);
        };

        const runLoop = (startError?: unknown) => {
            let error = startError;

            for (;;) {
                if (settled) return;
                if (error) {
                    finish({ done: false, error });
                    return;
                }
                if (rawRes.writableEnded) {
                    finish({ done: false });
                    return;
                }

                const handler = handlers[index++];
                if (!handler) {
                    finish(CHAIN_DONE);
                    return;
                }

                recordedNext = false;
                recordedError = undefined;
                handlerRunning = true;

                let returned: unknown;
                try {
                    returned = handler(req, res, next);
                } catch (handlerError) {
                    handlerRunning = false;
                    error = handlerError;
                    continue;
                }
                handlerRunning = false;

                if (isPromiseLike(returned)) {
                    Promise.resolve(returned).catch(next);
                }

                if (recordedNext) {
                    error = recordedError;
                    continue;
                }

                if (rawRes.writableEnded) {
                    finish({ done: false });
                    return;
                }

                // The handler took control asynchronously: it will call next()
                // later or end the response. Arm listeners so whichever happens
                // first settles the chain.
                if (!armed) {
                    armed = true;
                    rawRes.on('finish', onResponseFinished);
                    rawRes.on('close', onResponseFinished);
                }
                return;
            }
        };

        runLoop();

        if (settled) return syncResult!;

        return new Promise<ChainResult>((resolve) => {
            resolvePromise = resolve;
        });
    }

    private runNotFound(req: DRequest, res: DResponse): void | Promise<void> {
        if (!this.notFoundHandler) {
            if (!res.headersSent) res.status(404).json({ message: 'this endpoint does not exist' });
            return;
        }

        const result = this.runChain(this.notFoundChain, req, res);
        if (isPromiseLike(result)) {
            return result.then((chainResult) => {
                if (chainResult.error) return this.runErrorHandlers(chainResult.error, req, res);
            });
        }
        if (result.error) return this.runErrorHandlers(result.error, req, res);
    }

    /**
     * Walks the registered error handlers (errorConverter, errorHandler, user
     * onError) until one sends a response. Sends a bare 500 if they all pass.
     */
    private runErrorHandlers(error: unknown, req: DRequest, res: DResponse): Promise<void> {
        return new Promise((resolve) => {
            const rawRes = res.raw!;
            let settled = false;

            const done = () => {
                if (settled) return;
                settled = true;
                rawRes.off('finish', done);
                rawRes.off('close', done);
                resolve();
            };

            // An error handler that sends a response ends the chain.
            if (rawRes.writableEnded) {
                done();
                return;
            }
            rawRes.on('finish', done);
            rawRes.on('close', done);

            let index = 0;
            let currentError = error;

            const next: Next = (nextError) => {
                if (settled) return;
                if (nextError !== undefined && nextError !== null) currentError = nextError;

                const handler = this.errorHandlers[index++];
                if (!handler) {
                    if (!rawRes.writableEnded) {
                        res.status(500).json({ message: 'Internal Server Error' });
                    }
                    done();
                    return;
                }

                try {
                    const result = handler(currentError, req, res, next) as PromiseLike<unknown> | undefined;
                    if (typeof result?.then === 'function') {
                        Promise.resolve(result).catch(next);
                    }
                } catch (handlerError) {
                    next(handlerError);
                }
            };

            next(error);
        });
    }

    // ── Request / response facades ──────────────────────────────────────────

    /**
     * Augments the Node request in place (the Express approach) so middleware
     * and route handlers share one object — `req.payload` set by a middleware
     * is the same slot a `@DPayload()` handler reads.
     */
    private prepareRequest(raw: IncomingMessage): DRequest {
        const req = raw as IncomingMessage & DRequest & Record<string, any>;

        req.raw = raw;
        req.originalUrl = raw.url;
        req.params = {};

        // Split the query by hand: `new URL()` per request was one of the
        // hottest costs in the baseline, and most requests have no query at all.
        const rawUrl = raw.url || '';
        const queryStart = rawUrl.indexOf('?');
        if (queryStart === -1) {
            req.query = {};
        } else {
            try {
                req.query = parseQuery(rawUrl.slice(queryStart + 1));
            } catch {
                req.query = {};
            }
        }

        // Shared function, not a per-request closure.
        req.get = reqGet;

        // Plain eager fields instead of three Object.defineProperty calls —
        // defineProperty is an order of magnitude slower than a property set.
        req.ip = raw.socket.remoteAddress;
        req.hostname = String(raw.headers.host || '').split(':')[0] || undefined;
        req.protocol = 'http';

        return req;
    }

    /**
     * Augments the Node response in place with the Express `res` surface
     * (`status`, `json`, `send`, `cookie`, `locals`, ...) that Dolph handlers
     * and third-party middleware expect.
     */
    private prepareResponse(raw: ServerResponse): DResponse {
        const res = raw as ServerResponse & DResponse & Record<string, any>;

        res.raw = raw;
        res.locals ??= {};

        // Shared module-level functions (they use `this`, which is `res` when
        // called as methods) — no closures allocated per response. `end` is
        // intentionally NOT overridden: res IS the ServerResponse, so the
        // native end() already returns this object and accepts chunks.
        res.status = resStatus;
        res.set = resSet;
        res.get = resGet;
        res.type = resType;
        res.contentType = resType;
        res.json = resJson;
        res.send = resSend;
        res.cookie = resCookie;
        res.clearCookie = resClearCookie;
        res.redirect = resRedirect;
        res.render = resRender;
        (res as unknown as Record<symbol, unknown>)[ADAPTER_KEY] = this;

        return res;
    }

    // ── Body parsing ────────────────────────────────────────────────────────

    /** Returns `void` for bodyless requests — no Promise allocated on GETs. */
    private parseBody(req: DRequest, raw: IncomingMessage): void | Promise<void> {
        const contentType = String(raw.headers['content-type'] || '');
        const contentLength = Number(raw.headers['content-length'] || 0);
        const hasBody = contentLength > 0 || Boolean(raw.headers['transfer-encoding']);

        if (!hasBody) {
            req.body = {};
            return;
        }

        return new Promise((resolve, reject) => {
            if (contentType.includes('application/json')) {
                // Fastify rejects on content-length before reading — the client
                // may still be writing, so we must not wait for the full body.
                if (contentLength > this.jsonLimitBytes) {
                    const err: any = new Error('Request body exceeds the configured jsonLimit');
                    err.statusCode = 413;
                    reject(err);
                    return;
                }

                const chunks: Buffer[] = [];
                let size = 0;
                let rejected = false;

                const onData = (chunk: Buffer) => {
                    if (rejected) return;
                    size += chunk.length;
                    if (size > this.jsonLimitBytes) {
                        rejected = true;
                        raw.removeListener('data', onData);
                        raw.removeListener('end', onEnd);
                        raw.destroy();
                        const err: any = new Error('Request body exceeds the configured jsonLimit');
                        err.statusCode = 413;
                        reject(err);
                        return;
                    }
                    chunks.push(chunk);
                };

                const onEnd = () => {
                    if (rejected) return;
                    const body = Buffer.concat(chunks);
                    // Byte-exact bytes for HMAC webhook verification — JSON.stringify(req.body) can't reproduce them.
                    req.rawBody = body;

                    if (body.length === 0) {
                        req.body = {};
                        resolve();
                        return;
                    }

                    try {
                        req.body = JSON.parse(body.toString());
                        resolve();
                    } catch {
                        const err: any = new Error('Invalid JSON payload');
                        err.statusCode = 400;
                        reject(err);
                    }
                };

                raw.on('data', onData);
                raw.on('end', onEnd);
                raw.on('error', (error) => {
                    if (!rejected) reject(error);
                });
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                if (contentLength > URLENCODED_BODY_LIMIT) {
                    const err: any = new Error('Request body exceeds the urlencoded limit');
                    err.statusCode = 413;
                    reject(err);
                    return;
                }

                const chunks: Buffer[] = [];
                let size = 0;
                let rejected = false;

                const onData = (chunk: Buffer) => {
                    if (rejected) return;
                    size += chunk.length;
                    if (size > URLENCODED_BODY_LIMIT) {
                        rejected = true;
                        raw.removeListener('data', onData);
                        raw.removeListener('end', onEnd);
                        raw.destroy();
                        const err: any = new Error('Request body exceeds the urlencoded limit');
                        err.statusCode = 413;
                        reject(err);
                        return;
                    }
                    chunks.push(chunk);
                };

                const onEnd = () => {
                    if (rejected) return;
                    req.body = parseQuery(Buffer.concat(chunks).toString());
                    resolve();
                };

                raw.on('data', onData);
                raw.on('end', onEnd);
                raw.on('error', reject);
            } else {
                // Unknown content type — leave the stream unread so the uploader
                // or a handler can consume it (matches the Fastify adapter).
                req.body = {};
                resolve();
            }
        });
    }

    // ── Routing ─────────────────────────────────────────────────────────────

    /**
     * Segment matcher with Express/Fastify semantics: case-insensitive static
     * segments, trailing and duplicate slashes ignored, `:param` captures.
     *
     * Fills module-level scratch buffers instead of allocating two arrays per
     * request, and lowercases once per segment (routes are pre-lowercased at
     * registration). On a match with `:params`, writes them straight onto
     * `req.params`; static matches keep the `{}` from prepareRequest.
     */
    private matchRoute(method: string, rawUrl: string, req: DRequest): AdapterHandler[] | null {
        // Split off the query without `new URL()` or a second string alloc.
        const queryStart = rawUrl.indexOf('?');
        const pathEnd = queryStart === -1 ? rawUrl.length : queryStart;

        requestSegments.length = 0;
        requestSegmentsLower.length = 0;
        let segmentStart = 0;
        for (let i = 0; i <= pathEnd; i++) {
            if (i === pathEnd || rawUrl.charCodeAt(i) === 47 /* / */) {
                if (i > segmentStart) {
                    const segment = rawUrl.slice(segmentStart, i);
                    requestSegments.push(segment);
                    requestSegmentsLower.push(segment.toLowerCase());
                }
                segmentStart = i + 1;
            }
        }

        // Node reports 'GET'; registration normalised to uppercase too.
        const byCount = this.routeGroups.get(method);
        if (byCount) {
            const group = byCount.get(requestSegments.length);
            if (group) {
                const found = this.scanGroup(group, req);
                if (found) return found;
            }
        }

        // HEAD falls back to the GET route, as Express does.
        if (method === 'HEAD') {
            const getGroups = this.routeGroups.get('GET');
            const group = getGroups?.get(requestSegments.length);
            if (group) return this.scanGroup(group, req);
        }

        return null;
    }

    private scanGroup(group: RouteEntry[], req: DRequest): AdapterHandler[] | null {
        for (const route of group) {
            let params: Record<string, string> | null = null;
            let matched = true;

            for (let i = 0; i < requestSegments.length; i++) {
                const pattern = route.segments[i];

                if (pattern.charCodeAt(0) === 58 /* : */) {
                    // Params keep the original case; only static segments are
                    // compared case-insensitively against the lowercased copy.
                    params ??= {};
                    try {
                        params[pattern.slice(1)] = decodeURIComponent(requestSegments[i]);
                    } catch {
                        params[pattern.slice(1)] = requestSegments[i];
                    }
                } else if (pattern !== requestSegmentsLower[i]) {
                    matched = false;
                    break;
                }
            }

            if (matched) {
                if (params) req.params = params;
                return route.handlers;
            }
        }

        return null;
    }

    // ── Views ───────────────────────────────────────────────────────────────

    private renderView(res: DResponse, view: string, data?: object) {
        const config = this.viewsConfig;
        const rawRes = res.raw!;

        const sendHtml = (html: string) => {
            if (rawRes.writableEnded) return;
            rawRes.setHeader('content-type', 'text/html; charset=utf-8');
            rawRes.end(html);
        };

        const sendError = (error: Error) => {
            if (rawRes.writableEnded) return;
            rawRes.statusCode = 500;
            rawRes.setHeader('content-type', JSON_CONTENT_TYPE);
            rawRes.end(JSON.stringify({ message: error.message }));
        };

        if (!config) {
            sendError(new Error('No view engine configured. Set `views` in dolph_config.yaml.'));
            return;
        }

        const { engine, viewsDir } = config;
        const templateName = view.includes('.') ? view : `${view}.${engine}`;
        const templatePath = join(viewsDir, templateName);
        const locals = data || {};

        try {
            if (engine === 'ejs') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const ejs = require('ejs');
                ejs.renderFile(templatePath, locals, (error: Error | null, html: string) => {
                    if (error) sendError(error);
                    else sendHtml(html);
                });
            } else if (engine === 'pug') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pug = require('pug');
                sendHtml(pug.renderFile(templatePath, locals));
            } else if (engine === 'handlebars') {
                const compiled = this.engines['.handlebars'] as (
                    path: string,
                    options: object,
                    callback: (error: Error | null, html: string) => void,
                ) => void;
                compiled(templatePath, { ...locals, settings: { 'view engine': engine } }, (error: Error | null, html: string) => {
                    if (error) sendError(error);
                    else sendHtml(html);
                });
            } else {
                sendError(new Error(`Unsupported view engine '${engine}'. Use ejs, pug or handlebars.`));
            }
        } catch (error) {
            sendError(error as Error);
        }
    }

    // ── Static files ────────────────────────────────────────────────────────

    private tryServeStatic(rawReq: IncomingMessage, rawRes: ServerResponse): boolean {
        if (!this.staticRoot || rawRes.headersSent) return false;

        let pathname: string;
        try {
            pathname = decodeURIComponent(new URL(rawReq.url || '/', 'http://localhost').pathname);
        } catch {
            return false;
        }

        // Resolve against the root and refuse anything that escapes it (`..`).
        const root = normalize(resolvePath(this.staticRoot));
        const filePath = normalize(resolvePath(root, `.${pathname}`));
        if (filePath !== root && !filePath.startsWith(root + '/')) return false;

        let stats;
        try {
            stats = statSync(filePath);
        } catch {
            return false;
        }
        if (!stats.isFile()) return false;

        const contentType = resolveContentType(extname(filePath).toLowerCase());
        if (contentType) rawRes.setHeader('content-type', contentType);
        rawRes.setHeader('content-length', stats.size);
        rawRes.statusCode = 200;

        if (rawReq.method === 'HEAD') {
            rawRes.end();
            return true;
        }

        const stream = createReadStream(filePath);
        stream.on('error', () => {
            if (!rawRes.headersSent) {
                rawRes.statusCode = 500;
                rawRes.end();
            } else {
                rawRes.destroy();
            }
        });
        stream.pipe(rawRes);
        return true;
    }
}