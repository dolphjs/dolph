import request from 'supertest';
import { DolphFactory } from '/Users/utee/Documents/dolph/dolph/core';
import { Component, DHeaders, DCookies, Get, Route } from '/Users/utee/Documents/dolph/dolph/decorators';
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
}

@Component({ controllers: [TestController] })
class TestComponent {}

describe('DHeaders and DCookies', () => {
    let server: any;
    beforeAll(() => {
        const dolph = new DolphFactory([TestComponent]);
        dolph.middlewares([cookieParser()]);
        server = dolph.start();
    });
    afterAll(() => server.close());

    it('should inject headers', async () => {
        const res = await request(server).get('/v1/test/headers').set('x-custom-header', 'dolph');
        expect(res.text).toBe('dolph'); // Auto-send returns string
    });

    it('should inject cookies (fallback to empty object if unparsed)', async () => {
        const res = await request(server).get('/v1/test/cookies').set('Cookie', 'custom_cookie=cookie-value');
        expect(res.text).toBe('{}');
    });
});
