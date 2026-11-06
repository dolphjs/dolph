import { DolphServiceHandler, DolphSocketServiceHandler } from '../classes';
import { Dolph } from '../common';
import { Component, Socket } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { GlobalServiceRegistry } from '../core';
import { SocketComponent } from '../packages';
import { startSocketApp } from './utils/socket_app';

// Written the way the docs show it, without touching socketService first.
class DocsExampleSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.socket.on('connection', (socket) => {
            socket.emit('ready', { ok: true });
        });
    }
}

describe('DolphSocketServiceHandler', () => {
    it('should allow this.socket straight away in the constructor', async () => {
        const app = await startSocketApp(DocsExampleSocketService, { auth: false });

        const client = await app.connect();

        expect(client.connected).toBe(true);
        await app.close();
    });
});

describe('@Socket services', () => {
    class CounterService extends DolphServiceHandler<Dolph> {
        count = 0;

        constructor() {
            super('counter');
        }
    }

    class UnregisteredService extends DolphServiceHandler<Dolph> {
        constructor() {
            super('unregistered');
        }
    }

    class Controller extends DolphControllerHandler<Dolph> {}

    class CounterSocketService extends DolphSocketServiceHandler<Dolph> {
        declare CounterService: CounterService;
        declare UnregisteredService: UnregisteredService;
    }

    // Decorated before the @Component below, the order an app's imports can easily produce.
    @Socket({ services: [CounterService, UnregisteredService], socketServices: [CounterSocketService] })
    class CounterSocketComponent extends SocketComponent {}

    @Component({ controllers: [Controller], services: [CounterService] })
    class CounterComponent {}

    it('should share the singleton used by @Component', () => {
        const handler = new (CounterSocketService as unknown as new () => CounterSocketService)();

        handler.CounterService.count = 5;

        expect(GlobalServiceRegistry.get(CounterService).count).toBe(5);
        expect(new CounterSocketComponent()).toBeDefined();
        expect(new CounterComponent()).toBeDefined();
    });

    it('should create and share a service no component registered', () => {
        const first = new (CounterSocketService as unknown as new () => CounterSocketService)();
        const second = new (CounterSocketService as unknown as new () => CounterSocketService)();

        expect(first.UnregisteredService).toBe(second.UnregisteredService);
    });

    it('should allow a service to be replaced on one instance', () => {
        const handler = new (CounterSocketService as unknown as new () => CounterSocketService)();
        const stub = {} as CounterService;

        handler.CounterService = stub;

        expect(handler.CounterService).toBe(stub);
    });

    it('should refuse to start without an array of socket services', () => {
        expect(() => Socket({ services: [], socketServices: undefined })).toThrow('array of socket services');
    });
});
