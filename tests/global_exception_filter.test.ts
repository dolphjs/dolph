import request from 'supertest';
import { DolphFactory } from '/Users/utee/Documents/dolph/dolph/core';
import { Component, Get, Route } from '/Users/utee/Documents/dolph/dolph/decorators';
import { DolphControllerHandler } from '/Users/utee/Documents/dolph/dolph/classes';
import { Dolph } from '/Users/utee/Documents/dolph/dolph/common';

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
        const dolph = new DolphFactory([ErrorComponent]);
        
        // Register custom exception handler
        dolph.setGlobalExceptionHandler((err, req, res, next) => {
            if (err.message === 'Test Error') {
                return res.status(503).json({ success: false, msg: 'Caught by global filter' });
            }
            next(err);
        });

        server = dolph.start();
    });

    afterAll(() => server.close());

    it('should catch errors thrown in controllers using the custom global handler', async () => {
        const res = await request(server).get('/v1/error/throw');
        expect(res.status).toBe(503);
        expect(res.body).toEqual({ success: false, msg: 'Caught by global filter' });
    });
});
