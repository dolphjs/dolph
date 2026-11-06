import request from 'supertest';
import { DolphFactory } from '../core';
import { Component, DRes, Get, Post, Route, UseMiddleware } from '../decorators';
import { DNextFunc, DolphAsyncMiddleware, DRequest, DResponse, ResponseInterceptor } from '../common';

const mark = (label: string) => (req: DRequest, res: DResponse, next: DNextFunc) => {
    res.locals.order = [...(res.locals.order ?? []), label];
    next();
};

const failingMiddleware = DolphAsyncMiddleware(async () => {
    throw new Error('middleware failed');
});

@Route('routes')
class RouteController {
    @Get('together')
    @UseMiddleware(mark('first'), mark('second'), mark('third'))
    together(_req: DRequest, res: DResponse) {
        return res.locals.order;
    }

    @Get('stacked')
    @UseMiddleware(mark('top'))
    @UseMiddleware(mark('bottom'))
    stacked(_req: DRequest, res: DResponse) {
        return res.locals.order;
    }

    @Post('created')
    created(@DRes() res: DResponse) {
        res.status(201);
        return { id: 1 };
    }

    @Post('created-async')
    async createdAsync(_req: DRequest, res: DResponse) {
        res.status(201);
        return 'made';
    }

    @Post('plain')
    plain() {
        return { id: 1 };
    }

    @Get('failing')
    @UseMiddleware(failingMiddleware)
    failing() {
        return { reached: true };
    }
}

@Component({ controllers: [RouteController], services: [] })
class RouteComponent {}

describe('Route middleware and status codes', () => {
    const app = new DolphFactory([RouteComponent]).engine();

    it('should run @UseMiddleware arguments left to right', async () => {
        const res = await request(app).get('/v1/routes/together');

        expect(res.body.data).toEqual(['first', 'second', 'third']);
    });

    it('should keep the order of stacked @UseMiddleware, bottom first', async () => {
        const res = await request(app).get('/v1/routes/stacked');

        expect(res.body.data).toEqual(['bottom', 'top']);
    });

    it('should keep a status set by the handler and report it in the envelope', async () => {
        const res = await request(app).post('/v1/routes/created');

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ success: true, status: 201, message: 'Request successful', data: { id: 1 } });
    });

    it('should keep a status set by an async handler returning a string', async () => {
        const res = await request(app).post('/v1/routes/created-async');

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('made');
    });

    it('should default to 200', async () => {
        const res = await request(app).post('/v1/routes/plain');

        expect(res.status).toBe(200);
    });

    it('should keep a status set by the handler with onResponse', async () => {
        const onResponse: ResponseInterceptor = (data) => ({ wrapped: data });
        const res = await request(new DolphFactory([RouteComponent], { onResponse }).engine()).post(
            '/v1/routes/created',
        );

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ wrapped: { id: 1 } });
    });

    it('should turn a rejected DolphAsyncMiddleware into an error response', async () => {
        const res = await request(app).get('/v1/routes/failing');

        expect(res.status).toBe(500);
    });
});
