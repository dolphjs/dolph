import { DolphFactory } from '/Users/utee/Documents/dolph/dolph/core';
import { Component, Get, Route } from '/Users/utee/Documents/dolph/dolph/decorators';
import { DolphControllerHandler } from '/Users/utee/Documents/dolph/dolph/classes';
import { Dolph } from '/Users/utee/Documents/dolph/dolph/common';
import cookieParser from 'cookie-parser';

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
    it('should parse external middlewares array and sockets object correctly', () => {
        const middlewares = [cookieParser()];
        const sockets = { socketService: { on: () => {} } } as any;

        const dolph = new DolphFactory([DummyComponent], middlewares, sockets);
        
        // Expose internals via typing override for the sake of the test
        const dolphAny = dolph as any;

        expect(dolphAny.externalMiddlewares).toBe(middlewares);
        expect(dolphAny.sockets).toBe(sockets);
    });
});
