import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '../core';
import { Component, Get, Post, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';
import { GlobalServiceRegistry } from '../core/initialisers/global_service_registry';

// A simple counter service — its internal state proves whether
// the same instance is shared across components.
class CounterService {
    private count = 0;

    increment() {
        this.count++;
    }

    getCount() {
        return this.count;
    }
}

// ---- Component A ----
@Route('/a')
class ControllerA extends DolphControllerHandler<Dolph> {
    constructor(private counterService: CounterService) {
        super();
    }

    @Post('/increment')
    increment() {
        this.counterService.increment();
        return { count: this.counterService.getCount() };
    }
}

@Component({ controllers: [ControllerA], services: [CounterService] })
class ComponentA {}

// ---- Component B — declares the SAME CounterService ----
@Route('/b')
class ControllerB extends DolphControllerHandler<Dolph> {
    constructor(private counterService: CounterService) {
        super();
    }

    @Get('/count')
    getCount() {
        return { count: this.counterService.getCount() };
    }
}

@Component({ controllers: [ControllerB], services: [CounterService] })
class ComponentB {}

describe('Global DI singleton across components', () => {
    let server: any;

    beforeAll(() => {
        // Reset the global registry so this test is isolated from others
        GlobalServiceRegistry._reset();
        // One real ephemeral listener per file — see auto_send.test.ts for why.
        server = createServer(new DolphFactory([ComponentA, ComponentB]).engine()).listen(0);
    });

    afterAll(() => {
        server.close();
    });

    it('service incremented via ComponentA is visible from ComponentB — same instance', async () => {
        // Increment via ComponentA's controller
        const incRes = await request(server).post('/v1/a/increment').send();
        expect(incRes.status).toBe(200);
        expect(incRes.body.data.count).toBe(1);

        // Read the count through ComponentB's controller — should see 1, not 0
        const countRes = await request(server).get('/v1/b/count');
        expect(countRes.status).toBe(200);
        expect(countRes.body.data.count).toBe(1);

        // Increment again and verify both views stay in sync
        await request(server).post('/v1/a/increment').send();
        const countRes2 = await request(server).get('/v1/b/count');
        expect(countRes2.body.data.count).toBe(2);
    });
});
