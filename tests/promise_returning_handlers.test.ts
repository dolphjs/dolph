import request from 'supertest';
import { createServer, Server } from 'http';
import { DolphFactory } from '../core';
import { Component, Get, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { BadRequestException, Dolph, DRequest, DResponse, NotFoundException } from '../common';

type Thenable<T> = { then: (onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) => unknown };

@Route('/promises')
class PromiseController extends DolphControllerHandler<Dolph> {
    @Get('/resolved')
    resolved() {
        return Promise.resolve({ users: [1, 2] });
    }

    @Get('/resolved-null')
    resolvedNull() {
        return Promise.resolve(null);
    }

    @Get('/rejected-http')
    rejectedHttp() {
        return Promise.reject(new NotFoundException('user does not exist'));
    }

    @Get('/rejected-plain')
    rejectedPlain() {
        return Promise.reject(new Error('db down'));
    }

    @Get('/thenable')
    thenable(): Thenable<{ ok: boolean }> {
        return { then: (onFulfilled) => onFulfilled({ ok: true }) };
    }

    @Get('/manual')
    manual(_req: DRequest, res: DResponse) {
        res.status(201).json({ manual: true });
        return Promise.resolve({ ignored: true });
    }

    @Get('/sync')
    sync() {
        return { sync: true };
    }

    @Get('/sync-throw')
    syncThrow() {
        throw new BadRequestException('bad input');
    }
}

@Component({ controllers: [PromiseController], services: [] })
class PromiseComponent {}

describe('Controllers returning promises from non-async methods', () => {
    let server: Server;
    const unhandled = jest.fn();

    beforeAll(() => {
        process.on('unhandledRejection', unhandled);
        server = createServer(new DolphFactory([PromiseComponent]).engine()).listen(0);
    });

    afterAll((done) => {
        process.off('unhandledRejection', unhandled);
        server.close(done);
    });

    it('should send the resolved value instead of an empty object', async () => {
        const res = await request(server).get('/v1/promises/resolved');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ users: [1, 2] });
    });

    it('should return 204 when the promise resolves to null', async () => {
        const res = await request(server).get('/v1/promises/resolved-null');

        expect(res.status).toBe(204);
    });

    it('should send the exception status when the promise rejects', async () => {
        const res = await request(server).get('/v1/promises/rejected-http');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('user does not exist');
    });

    it('should return 500 and not leak an unhandled rejection when the promise rejects with a plain error', async () => {
        const res = await request(server).get('/v1/promises/rejected-plain');
        await new Promise((resolve) => setImmediate(resolve));

        expect(res.status).toBe(500);
        expect(unhandled).not.toHaveBeenCalled();
    });

    it('should resolve custom thenables', async () => {
        const res = await request(server).get('/v1/promises/thenable');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ ok: true });
    });

    it('should not send twice when the handler already responded', async () => {
        const res = await request(server).get('/v1/promises/manual');

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ manual: true });
    });

    it('should keep handling plain sync values and sync throws', async () => {
        const ok = await request(server).get('/v1/promises/sync');
        const failed = await request(server).get('/v1/promises/sync-throw');

        expect(ok.body.data).toEqual({ sync: true });
        expect(failed.status).toBe(400);
    });
});
