import { createServer, IncomingMessage, request as httpRequest } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { IsString } from 'class-validator';
import { DolphFactory } from '../core';
import { Component, DBody, DCookies, DPayload, Get, Post, Route, UseMiddleware } from '../decorators';
import { DolphRouteHandler } from '../classes';
import { Dolph, DNextFunc, DRequest, DResponse } from '../common';

class NameDto {
    @IsString()
    name!: string;
}

const globalAuth = (req: DRequest, res: DResponse, next: DNextFunc) => {
    if (req.headers['x-blocked']) {
        res.status(401).json({ blocked: true });
        return;
    }
    req.payload = { sub: 'from-global-middleware' } as DRequest['payload'];
    res.locals.seen = true;
    next();
};

const routeGuard = (_req: DRequest, res: DResponse, next: DNextFunc) => {
    res.set('x-route-guard', 'ran');
    next();
};

@Route('fast')
class FastController {
    @Get('payload')
    payload(@DPayload() payload: { sub: string }) {
        return payload;
    }

    @Get('locals')
    locals(_req: DRequest, res: DResponse) {
        return { seen: res.locals.seen ?? false };
    }

    @Get('cookies')
    cookies(@DCookies() cookies: Record<string, string>) {
        return cookies;
    }

    @Get('set-cookie')
    setCookie(_req: DRequest, res: DResponse) {
        res.cookie('session', 'abc', { httpOnly: true, sameSite: 'lax', maxAge: 60_000 });
        return { ok: true };
    }

    @Get('html')
    html(_req: DRequest, res: DResponse) {
        res.send('<h1>page</h1>');
    }

    @Get('redirect')
    redirect(_req: DRequest, res: DResponse) {
        res.redirect('/v1/fast/html');
    }

    @Get('query')
    query(req: DRequest) {
        return req.query;
    }

    @Get('header')
    header(req: DRequest) {
        return { agent: req.get('X-Custom') ?? null };
    }

    @Get('nothing')
    nothing(_req: DRequest, res: DResponse) {
        res.status(204).end();
    }

    @Post('raw')
    raw(req: DRequest) {
        return { raw: req.rawBody?.toString() ?? null, body: req.body };
    }

    @Post('dto')
    @UseMiddleware(routeGuard)
    dto(@DBody(NameDto) body: NameDto) {
        return body;
    }

    @Get('fall-through')
    fallThrough(_req: DRequest, _res: DResponse, next: DNextFunc) {
        next();
    }
}

@Component({ controllers: [FastController], services: [] })
class FastComponent {}

describe('Fastify adapter', () => {
    const original = process.env.DOLPH_ADAPTER;
    let app: ReturnType<DolphFactory['engine']>;

    beforeAll(() => {
        process.env.DOLPH_ADAPTER = 'fastify';
        const dolph = new DolphFactory([FastComponent], { middlewares: [cookieParser(), globalAuth] });
        app = dolph.engine();
    });

    afterAll(() => {
        process.env.DOLPH_ADAPTER = original ?? '';
    });

    const get = (path: string) => request(app).get(`/v1/fast/${path}`);

    it('should expose the Fastify instance through engine()', () => {
        expect(typeof (app as unknown as { register: unknown }).register).toBe('function');
    });

    describe('middleware through middie', () => {
        it('should carry values set by global middleware to the handler', async () => {
            const payload = await get('payload');
            const locals = await get('locals');

            expect(payload.body.data).toEqual({ sub: 'from-global-middleware' });
            expect(locals.body.data).toEqual({ seen: true });
        });

        it('should let Dolph style middleware respond', async () => {
            const res = await get('payload').set('x-blocked', '1');

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ blocked: true });
        });

        it('should run third-party Express middleware', async () => {
            const res = await get('cookies').set('Cookie', 'theme=dark');

            expect(res.body.data).toEqual({ theme: 'dark' });
        });

        it('should run route middleware and validate DTOs', async () => {
            const good = await request(app).post('/v1/fast/dto').send({ name: 'dolph' });
            const bad = await request(app).post('/v1/fast/dto').send({});

            expect(good.status).toBe(200);
            expect(good.headers['x-route-guard']).toBe('ran');
            expect(bad.status).toBe(400);
        });
    });

    describe('responses match Express', () => {
        it('should send strings through res.send as HTML', async () => {
            const res = await get('html');

            expect(res.headers['content-type']).toMatch(/text\/html/);
            expect(res.text).toBe('<h1>page</h1>');
        });

        it('should set cookies with maxAge in milliseconds', async () => {
            const res = await get('set-cookie');
            const [cookie] = res.headers['set-cookie'] as unknown as string[];

            expect(cookie).toContain('session=abc');
            expect(cookie).toContain('Max-Age=60');
            expect(cookie).toContain('HttpOnly');
            expect(cookie).toContain('SameSite=Lax');
        });

        it('should redirect', async () => {
            const res = await get('redirect').redirects(0);

            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('/v1/fast/html');
        });

        it('should end a response with no body', async () => {
            const res = await get('nothing');

            expect(res.status).toBe(204);
        });

        it('should fall through to the 404 handler when a handler calls next()', async () => {
            const res = await get('fall-through');

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('this endpoint does not exist');
        });
    });

    describe('requests match Express', () => {
        it('should ignore case and trailing slashes in paths', async () => {
            expect((await request(app).get('/v1/FAST/locals')).status).toBe(200);
            expect((await request(app).get('/v1/fast/locals/')).status).toBe(200);
        });

        it('should parse nested query strings', async () => {
            const res = await get('query?filter[status]=open&tags[]=a&tags[]=b');

            expect(res.body.data).toEqual({ filter: { status: 'open' }, tags: ['a', 'b'] });
        });

        it('should read headers with req.get', async () => {
            const res = await get('header').set('x-custom', 'yes');

            expect(res.body.data).toEqual({ agent: 'yes' });
        });

        it('should keep the raw body bytes', async () => {
            const body = '{"amount":  100}';

            const res = await request(app).post('/v1/fast/raw').set('Content-Type', 'application/json').send(body);

            expect(res.body.data).toEqual({ raw: body, body: { amount: 100 } });
        });

        it('should parse urlencoded bodies', async () => {
            const res = await request(app).post('/v1/fast/raw').type('form').send('user[name]=dolph');

            expect(res.body.data.body).toEqual({ user: { name: 'dolph' } });
        });

        it('should treat an empty JSON body as an empty object', async () => {
            const res = await request(app).post('/v1/fast/raw').set('Content-Type', 'application/json');

            expect(res.status).toBe(200);
            expect(res.body.data.body).toEqual({});
        });

        it('should accept content types it has no parser for', async () => {
            const res = await request(app).post('/v1/fast/raw').set('Content-Type', 'text/plain').send('hello');

            expect(res.status).toBe(200);
        });

        it('should return 400 for malformed JSON', async () => {
            const res = await request(app).post('/v1/fast/raw').set('Content-Type', 'application/json').send('{ nope');

            expect(res.status).toBe(400);
        });

        it('should return 413 for a body over jsonLimit', async () => {
            // Declares the size and sends nothing, because Fastify rejects on
            // content-length and closes the socket while a client is still writing.
            const server = createServer(app as never).listen(0);
            const { port } = server.address() as AddressInfo;

            const res = await new Promise<IncomingMessage>((resolve, reject) => {
                const call = httpRequest({
                    port,
                    method: 'POST',
                    path: '/v1/fast/raw',
                    headers: { 'content-type': 'application/json', 'content-length': 6 * 1024 * 1024 },
                });

                call.on('response', resolve);
                call.on('error', reject);
                call.flushHeaders();
            });

            server.closeAllConnections();
            server.close();

            expect(res.statusCode).toBe(413);
        });
    });

    it('should refuse Express routers with a clear message', () => {
        class LegacyRouter extends DolphRouteHandler<Dolph> {
            path = '/legacy';
            controller = undefined as never;
            initRoutes() {
                return undefined;
            }
        }

        expect(() => new DolphFactory([new LegacyRouter() as never]).engine()).toThrow('adapter: express');
    });

    it('should refuse an unknown adapter', () => {
        process.env.DOLPH_ADAPTER = 'koa';

        expect(() => new DolphFactory([]).engine()).toThrow("Unknown adapter 'koa'");

        process.env.DOLPH_ADAPTER = 'fastify';
    });
});
