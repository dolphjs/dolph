import request from 'supertest';
import { DolphFactory } from '../core';
import { DolphControllerHandler, JWTAuthVerifyDec, JwtBasicAuth } from '../classes';
import { Dolph, DRequest, DResponse, SuccessResponse } from '../common';
import { JwtAuthMiddleware } from '../common/middlewares/jwt_auth.middleware';
import { Component, Get, Route, UseMiddleware } from '../decorators';
import { generateJWTwithHMAC } from '../utilities';

const SECRET = 'jwt-parity-test-secret';

@Route('/jwt-parity')
class JwtParityController extends DolphControllerHandler<Dolph> {
    @Get('/decorator')
    @JWTAuthVerifyDec(SECRET)
    viaDecorator(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { sub: (req.payload as { sub?: string })?.sub } });
    }

    @Get('/middleware')
    @UseMiddleware(JwtAuthMiddleware(new JwtBasicAuth(SECRET)))
    viaMiddleware(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { sub: (req.payload as { sub?: string })?.sub } });
    }
}

@Component({ controllers: [JwtParityController], services: [] })
class JwtParityComponent {}

describe('JWT auth decorator vs middleware parity', () => {
    let server: any;
    let token: string;

    beforeAll(() => {
        token = generateJWTwithHMAC({
            payload: { sub: 'parity-user', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 },
            secret: SECRET,
        });
        server = new DolphFactory([JwtParityComponent]).start();
    });

    afterAll(() => {
        server.close();
    });

    it('rejects unauthenticated requests the same way for both paths', async () => {
        const decRes = await request(server).get('/v1/jwt-parity/decorator');
        const mwRes = await request(server).get('/v1/jwt-parity/middleware');
        expect(decRes.status).toBe(401);
        expect(mwRes.status).toBe(401);
    });

    it('accepts Authorization HMAC JWT and exposes the same payload shape', async () => {
        const decRes = await request(server).get('/v1/jwt-parity/decorator').set('Authorization', token);
        const mwRes = await request(server).get('/v1/jwt-parity/middleware').set('Authorization', token);
        expect(decRes.status).toBe(200);
        expect(mwRes.status).toBe(200);
        expect(decRes.body.sub).toBe('parity-user');
        expect(mwRes.body.sub).toBe('parity-user');
    });
});
