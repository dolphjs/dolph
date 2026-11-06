import { createServer, Server } from 'http';
import request from 'supertest';
import { IsString } from 'class-validator';
import { DolphFactory } from '../core';
import { Component, DBody, DParam, DPayload, DService, Get, Post, Route, Shield, Socket, UnShield, UseMiddleware } from '../decorators';
import { DolphControllerHandler, DolphServiceHandler, DolphSocketServiceHandler } from '../classes';
import { Dolph, DNextFunc, DRequest, DResponse, NotFoundException } from '../common';
import { SocketComponent } from '../packages';

class CreateDto {
    @IsString()
    name!: string;
}

class IdDto {
    @IsString()
    id!: string;
}

const signedIn = (req: DRequest, _res: DResponse, next: DNextFunc) => {
    req.payload = { sub: 'user' } as DRequest['payload'];
    next();
};

const blockAll = (_req: DRequest, res: DResponse) => {
    res.status(403).json({ blocked: true });
};

class StoreService {
    items = ['first'];
}

@DService()
class ItemService {
    constructor(private store: StoreService) {}

    all() {
        return this.store.items;
    }

    add(name: string) {
        this.store.items.push(name);
        return name;
    }
}

@Route('items')
class ItemController {
    constructor(private items: ItemService) {}

    @Get('')
    list() {
        return this.items.all();
    }

    @Post('')
    create(@DBody(CreateDto) body: CreateDto) {
        return this.items.add(body.name);
    }

    @Get('missing/:id')
    missing(@DParam(IdDto) params: IdDto) {
        throw new NotFoundException(`no item ${params.id}`);
    }

    @Get('me')
    @UseMiddleware(signedIn)
    me(@DPayload() payload: { sub: string }) {
        return payload;
    }
}

@Route('property-injected')
class PropertyInjectedController {
    declare ItemService: ItemService;

    @Get('')
    list() {
        return this.ItemService.all();
    }
}

@Shield(blockAll)
@Route('shielded')
class ShieldedController {
    @Get('private')
    closed() {
        return 'never';
    }

    @Get('public')
    @UnShield()
    open() {
        return { open: true };
    }
}

@Component({
    controllers: [ItemController, PropertyInjectedController, ShieldedController],
    services: [StoreService, ItemService],
})
class ItemComponent {}

describe('Controllers and services as plain classes', () => {
    let server: Server;

    beforeAll(() => {
        server = createServer(new DolphFactory([ItemComponent]).engine()).listen(0);
    });

    afterAll((done) => {
        server.close(done);
    });

    const v1 = (path: string) => `/v1/${path}`;

    it('should route and inject services by constructor type', async () => {
        const res = await request(server).get(v1('items'));

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(['first']);
    });

    it('should validate DTOs', async () => {
        const good = await request(server).post(v1('items')).send({ name: 'second' });
        const bad = await request(server).post(v1('items')).send({ name: 5, extra: true });

        expect(good.status).toBe(200);
        expect(bad.status).toBe(400);
    });

    it('should return exceptions as HTTP errors', async () => {
        const res = await request(server).get(v1('items/missing/7'));

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('no item 7');
    });

    it('should run route middleware and param decorators', async () => {
        const res = await request(server).get(v1('items/me'));

        expect(res.body.data).toEqual({ sub: 'user' });
    });

    it('should inject services as properties when there is no constructor', async () => {
        const res = await request(server).get(v1('property-injected'));

        expect(res.status).toBe(200);
    });

    it('should apply shields', async () => {
        const blocked = await request(server).get(v1('shielded/private'));
        const open = await request(server).get(v1('shielded/public'));

        expect(blocked.status).toBe(403);
        expect(open.status).toBe(200);
    });
});

describe('Existing base class syntax', () => {
    class OldService extends DolphServiceHandler<Dolph> {
        constructor() {
            super('oldService');
        }

        greet() {
            return this.name;
        }
    }

    class NewService extends DolphServiceHandler {}

    @Route('old')
    class OldController extends DolphControllerHandler<Dolph> {
        constructor(private oldService: OldService) {
            super();
        }

        @Get('')
        greet() {
            return { name: this.oldService.greet() };
        }
    }

    @Component({ controllers: [OldController], services: [OldService] })
    class OldComponent {}

    it('should keep working', async () => {
        const res = await request(new DolphFactory([OldComponent]).engine()).get('/v1/old');

        expect(res.body.data).toEqual({ name: 'oldService' });
    });

    it('should not need a name or a generic', () => {
        expect(new NewService().name).toBeUndefined();
    });

    it('should allow socket services without a generic', () => {
        class ChatSocketService extends DolphSocketServiceHandler {}

        expect(() => Socket({ services: [StoreService], socketServices: [ChatSocketService] })(SocketComponent)).not.toThrow();
    });
});
