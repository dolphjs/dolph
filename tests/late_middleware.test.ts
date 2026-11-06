import request from 'supertest';
import { createServer, Server } from 'http';
import { DolphFactory } from '../core';
import { Component, Get, Post, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph, DNextFunc, DRequest, DResponse } from '../common';
import { logger } from '../utilities';

@Route('/late')
class LateController extends DolphControllerHandler<Dolph> {
    @Get('/ping')
    ping() {
        return { pong: true };
    }

    @Get('/locals')
    locals(_req: DRequest, res: DResponse) {
        return { seenBy: res.locals.seenBy ?? null };
    }

    @Post('/echo')
    echo(req: DRequest) {
        return req.body;
    }
}

@Component({ controllers: [LateController], services: [] })
class LateComponent {}

const markRequest = (_req: DRequest, res: DResponse, next: DNextFunc) => {
    res.locals.seenBy = 'late-middleware';
    next();
};

describe('Middleware added after DolphFactory construction', () => {
    let server: Server;

    beforeAll(() => {
        const dolph = new DolphFactory([LateComponent]);
        dolph.enableHelmet();
        dolph.enableCors({ origin: 'https://example.com' });
        dolph.middlewares([markRequest]);
        server = createServer(dolph.engine()).listen(0);
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should apply helmet headers to controller routes', async () => {
        const res = await request(server).get('/v1/late/ping');

        expect(res.status).toBe(200);
        expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('should apply cors headers to controller routes', async () => {
        const res = await request(server).get('/v1/late/ping').set('Origin', 'https://example.com');

        expect(res.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    it('should run middlewares() before the route handler', async () => {
        const res = await request(server).get('/v1/late/locals');

        expect(res.body.data).toEqual({ seenBy: 'late-middleware' });
    });

    it('should give middlewares() access to the parsed body', async () => {
        const res = await request(server).post('/v1/late/echo').send({ name: 'dolph' });

        expect(res.body.data).toEqual({ name: 'dolph' });
    });

    it('should apply helmet headers when the request body is malformed', async () => {
        const res = await request(server)
            .post('/v1/late/echo')
            .set('Content-Type', 'application/json')
            .send('{ not json');

        expect(res.status).toBe(400);
        expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('should keep enableHemet working as a deprecated alias', async () => {
        const warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
        const dolph = new DolphFactory([LateComponent]);

        dolph.enableHemet();

        const res = await request(dolph.engine()).get('/v1/late/ping');

        expect(res.headers['content-security-policy']).toBeDefined();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('enableHelmet()'));
        warn.mockRestore();
    });

    it('should apply helmet headers to the 404 fallback', async () => {
        const res = await request(server).get('/v1/late/missing');

        expect(res.status).toBe(404);
        expect(res.headers['content-security-policy']).toBeDefined();
    });
});
