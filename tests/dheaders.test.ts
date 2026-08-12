import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '/Users/utee/Documents/dolph/dolph/core';
import { Component, DHeaders, DCookies, DAuth, Get, Route } from '/Users/utee/Documents/dolph/dolph/decorators';
import { DolphControllerHandler } from '/Users/utee/Documents/dolph/dolph/classes';
import { Dolph } from '/Users/utee/Documents/dolph/dolph/common';
import cookieParser from 'cookie-parser';

@Route('/test')
class TestController extends DolphControllerHandler<Dolph> {
    @Get('/headers')
    getHeaders(@DHeaders() headers: any) {
        return headers['x-custom-header'];
    }

    @Get('/cookies')
    getCookies(@DCookies() cookies: any) {
        return cookies || 'NO_COOKIES';
    }

    @Get('/auth')
    getAuth(@DAuth() auth: any) {
        return auth;
    }
}

@Component({ controllers: [TestController] })
class TestComponent {}

describe('DHeaders, DCookies, and DAuth', () => {
    let server: any;
    beforeAll(() => {
        const dolph = new DolphFactory([TestComponent]);
        dolph.middlewares([cookieParser()]);
        // One real ephemeral listener per file — see auto_send.test.ts for why.
        server = createServer(dolph.engine()).listen(0);
    });
    afterAll(() => server.close());

    it('should inject headers', async () => {
        const res = await request(server).get('/v1/test/headers').set('x-custom-header', 'dolph');
        expect(res.body.message).toBe('dolph');
    });

    it('should inject cookies (fallback to empty object if unparsed)', async () => {
        const res = await request(server).get('/v1/test/cookies').set('Cookie', 'custom_cookie=cookie-value');
        expect(res.body.data).toEqual({});
    });

    it('should inject authorization header', async () => {
        const res = await request(server).get('/v1/test/auth').set('Authorization', 'Bearer my-token');
        expect(res.body.message).toBe('Bearer my-token');
    });

    it('should inject authorization header case-insensitively', async () => {
        const res = await request(server).get('/v1/test/auth').set('authorization', 'Bearer lower-token');
        expect(res.body.message).toBe('Bearer lower-token');
    });
});
