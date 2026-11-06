import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';

@Route('/error')
class ErrorController extends DolphControllerHandler<Dolph> {
    @Get('/throw')
    throwError() {
        throw new Error('Test Error');
    }
}

@Component({ controllers: [ErrorController] })
class ErrorComponent {}

describe('Global Exception Filter', () => {
    let server: any;

    beforeAll(() => {
        const dolph = new DolphFactory([ErrorComponent], {
            onError: (err, req, res, next) => {
                if (err.message === 'Test Error') {
                    return res.status(503).json({ success: false, msg: 'Caught by global filter' });
                }
                next(err);
            },
        });

        // One real ephemeral listener per file — see auto_send.test.ts for why.
        server = createServer(dolph.engine()).listen(0);
    });

    afterAll(() => server.close());

    it('should catch errors thrown in controllers using the custom global handler', async () => {
        const res = await request(server).get('/v1/error/throw');
        expect(res.status).toBe(503);
        expect(res.body).toEqual({ success: false, msg: 'Caught by global filter' });
    });
});
