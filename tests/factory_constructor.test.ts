import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

@Route('/dummy')
class DummyController extends DolphControllerHandler<Dolph> {
    @Get('/test')
    test() {
        return 'test';
    }
}

@Component({ controllers: [DummyController] })
class DummyComponent {}

describe('DolphFactory Constructor', () => {
    it('should use the middlewares option', async () => {
        const seen = jest.fn();
        const dolph = new DolphFactory([DummyComponent], {
            middlewares: [cookieParser(), (req, _res, next) => (seen(req.cookies), next())],
        });

        const res = await request(dolph.engine()).get('/v1/dummy/test').set('Cookie', 'name=dolph');

        expect(res.status).toBe(200);
        expect(seen).toHaveBeenCalledWith({ name: 'dolph' });
    });

    it('should reject the positional middleware array from 2.x', () => {
        expect(() => new DolphFactory([DummyComponent], [cookieParser()] as never)).toThrow('(components, options)');
    });

    it('should reject the GraphQL constructor shape from 2.x', () => {
        expect(() => new DolphFactory({ graphql: true, schema: {} } as never)).toThrow('(components, options)');
    });
});
