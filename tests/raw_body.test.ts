import request from 'supertest';
import { createServer } from 'http';
import { DolphFactory } from '/Users/utee/Documents/dolph/dolph/core';
import { Component, Post, Route } from '/Users/utee/Documents/dolph/dolph/decorators';
import { DolphControllerHandler } from '/Users/utee/Documents/dolph/dolph/classes';
import { Dolph, DRequest } from '/Users/utee/Documents/dolph/dolph/common';
import { DReq } from '/Users/utee/Documents/dolph/dolph/decorators';

@Route('/test')
class RawBodyController extends DolphControllerHandler<Dolph> {
    @Post('/echo-raw')
    echoRaw(@DReq() req: DRequest) {
        return {
            isBuffer: Buffer.isBuffer(req.rawBody),
            raw: req.rawBody?.toString('utf8'),
        };
    }
}

@Component({ controllers: [RawBodyController] })
class RawBodyComponent {}

describe('req.rawBody', () => {
    let server: any;
    beforeAll(() => {
        const dolph = new DolphFactory([RawBodyComponent]);
        server = createServer(dolph.engine()).listen(0);
    });
    afterAll(() => server.close());

    it('captures the exact raw bytes before JSON parsing', async () => {
        // Deliberately unusual spacing — proves this is the real wire bytes,
        // not a re-serialized JSON.stringify(req.body).
        const rawPayload = '{"a":1,   "b":  2}';

        const res = await request(server).post('/v1/test/echo-raw').set('Content-Type', 'application/json').send(rawPayload);

        expect(res.body.data.isBuffer).toBe(true);
        expect(res.body.data.raw).toBe(rawPayload);
    });

    it('supports HMAC verification using the raw bytes', async () => {
        const crypto = require('crypto');
        const secret = 'test-secret';
        const rawPayload = '{"event":"charge.success","reference":"abc123"}';
        const expectedSignature = crypto.createHmac('sha512', secret).update(rawPayload).digest('hex');

        const res = await request(server).post('/v1/test/echo-raw').set('Content-Type', 'application/json').send(rawPayload);

        const actualSignature = crypto.createHmac('sha512', secret).update(res.body.data.raw).digest('hex');
        expect(actualSignature).toBe(expectedSignature);
    });
});
