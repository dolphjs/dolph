import request from 'supertest';
import { DolphFactory } from '../core';
import { DBody, Component, Get, Post, Route } from '../decorators';
import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';

@Route('/auto-send')
class AutoSendController extends DolphControllerHandler<Dolph> {
    @Post('/object')
    async postObject(@DBody() body: any) {
        return body;
    }

    @Get('/text')
    getText() {
        return 'hello from dolph';
    }

    @Get('/html')
    getHtml() {
        return '<h1>DolphJS</h1>';
    }

    @Get('/null')
    getNull() {
        return null;
    }

    @Get('/number')
    getNumber() {
        return 42;
    }

    @Get('/array')
    getArray() {
        return [1, 2, 3];
    }

    @Get('/buffer')
    getBuffer() {
        return Buffer.from('binary-data');
    }
}

@Component({ controllers: [AutoSendController], services: [] })
class AutoSendComponent {}

describe('Auto-send controller return values', () => {
    let server: any;

    beforeAll(() => {
        server = new DolphFactory([AutoSendComponent]).start();
    });

    afterAll(() => {
        server.close();
    });

    it('POST returning object → 200 JSON echoed', async () => {
        const res = await request(server)
            .post('/v1/auto-send/object')
            .send({ name: 'Utee', age: 25 });
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toEqual({ name: 'Utee', age: 25 });
    });

    it('GET returning string → 200 text/plain', async () => {
        const res = await request(server).get('/v1/auto-send/text');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/plain/);
        expect(res.text).toBe('hello from dolph');
    });

    it('GET returning HTML string → 200 text/html', async () => {
        const res = await request(server).get('/v1/auto-send/html');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toBe('<h1>DolphJS</h1>');
    });

    it('GET returning null → 204 No Content', async () => {
        const res = await request(server).get('/v1/auto-send/null');
        expect(res.status).toBe(204);
        expect(res.text).toBe('');
    });

    it('GET returning number → 200 JSON', async () => {
        const res = await request(server).get('/v1/auto-send/number');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toBe(42);
    });

    it('GET returning array → 200 JSON', async () => {
        const res = await request(server).get('/v1/auto-send/array');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toEqual([1, 2, 3]);
    });

    it('GET returning Buffer → 200 binary', async () => {
        const res = await request(server)
            .get('/v1/auto-send/buffer')
            .buffer(true)
            .parse((res, callback) => {
                res.setEncoding('utf8');
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => callback(null, data));
            });
        expect(res.status).toBe(200);
        expect(res.body).toBe('binary-data');
    });
});
