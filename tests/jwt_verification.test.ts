import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer, Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { DolphFactory } from '../core';
import { Component, Get, Route, UseMiddleware } from '../decorators';
import { DolphControllerHandler, jwtAuth } from '../classes';
import { Dolph, DRequest } from '../common';

const SECRET = 'hmac-secret-that-must-never-leak';
const keyDir = mkdtempSync(join(tmpdir(), 'dolph-jwt-'));
const PUBLIC_KEY_PATH = join(keyDir, 'public.pem');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
writeFileSync(PUBLIC_KEY_PATH, publicKey);

const rsaOptions = { algorithm: 'RS256' } as const;
const handlerRuns = { count: 0 };
const respond = (req: DRequest) => {
    handlerRuns.count += 1;
    return { sub: req.payload?.sub };
};

@Route('jwt')
class JwtController extends DolphControllerHandler<Dolph> {
    @Get('/hmac')
    @UseMiddleware(jwtAuth(SECRET))
    hmac(req: DRequest) {
        return respond(req);
    }

    @Get('/rsa')
    @UseMiddleware(jwtAuth(PUBLIC_KEY_PATH, rsaOptions))
    rsa(req: DRequest) {
        return respond(req);
    }

    @Get('/authorize')
    @UseMiddleware(jwtAuth(SECRET, { authorize: async (payload) => payload.sub === 'admin' }))
    authorize(req: DRequest) {
        return respond(req);
    }

    @Get('/cookie')
    @UseMiddleware(jwtAuth(SECRET, { cookie: true }))
    cookie(req: DRequest) {
        return respond(req);
    }
}

@Component({ controllers: [JwtController], services: [] })
class JwtComponent {}

const hmacToken = (sub = 'user') => jwt.sign({ sub }, SECRET);
const rsaToken = (sub = 'user') => jwt.sign({ sub }, privateKey, { algorithm: 'RS256' });

describe('JWT verification', () => {
    let server: Server;

    beforeAll(() => {
        const dolph = new DolphFactory([JwtComponent], { middlewares: [cookieParser()] });
        server = createServer(dolph.engine()).listen(0);
    });

    beforeEach(() => {
        handlerRuns.count = 0;
    });

    afterAll((done) => {
        rmSync(keyDir, { recursive: true, force: true });
        server.close(done);
    });

    const get = (path: string) => request(server).get(`/v1/jwt/${path}`);

    describe('HMAC', () => {
        const path = 'hmac';

        it('should accept a token signed with the secret', async () => {
            const res = await get(path).set('authorization', hmacToken());

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ sub: 'user' });
        });

        it('should return 401 and not leak the secret when x-auth-token is sent', async () => {
            const res = await get(path).set('x-auth-token', 'anything');

            expect(res.status).toBe(401);
            expect(res.text).not.toContain(SECRET);
            expect(handlerRuns.count).toBe(0);
        });

        it('should return 401 for a malformed token', async () => {
            const res = await get(path).set('authorization', 'garbage');

            expect(res.status).toBe(401);
            expect(handlerRuns.count).toBe(0);
        });

        it('should return 401 for an expired token', async () => {
            const res = await get(path).set('authorization', jwt.sign({ sub: 'user' }, SECRET, { expiresIn: -10 }));

            expect(res.status).toBe(401);
        });

        it('should return 401 when no token is sent', async () => {
            const res = await get(path);

            expect(res.status).toBe(401);
        });

        it('should reject an unsigned token', async () => {
            const res = await get(path).set('authorization', jwt.sign({ sub: 'admin' }, '', { algorithm: 'none' }));

            expect(res.status).toBe(401);
            expect(handlerRuns.count).toBe(0);
        });

        it('should reject a token signed with the private key', async () => {
            const res = await get(path).set('authorization', rsaToken());

            expect(res.status).toBe(401);
        });
    });

    describe('RSA', () => {
        const path = 'rsa';

        it('should accept a token signed with the private key', async () => {
            const res = await get(path).set('x-auth-token', rsaToken());

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ sub: 'user' });
        });

        it('should reject a token forged using the key path as an HMAC secret', async () => {
            const forged = jwt.sign({ sub: 'attacker' }, PUBLIC_KEY_PATH);

            const viaAuthorization = await get(path).set('authorization', forged);
            const viaAuthToken = await get(path).set('x-auth-token', forged);

            expect(viaAuthorization.status).toBe(401);
            expect(viaAuthToken.status).toBe(401);
            expect(handlerRuns.count).toBe(0);
        });

        it('should reject a token forged using the public key as an HMAC secret', async () => {
            const encoded = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url');
            const { createHmac } = jest.requireActual('crypto');
            const signature = createHmac('sha256', publicKey).update(`${encoded}.${body}`).digest('base64url');

            const res = await get(path).set('x-auth-token', `${encoded}.${body}.${signature}`);

            expect(res.status).toBe(401);
        });
    });

    describe('authorize option', () => {
        it('should return 403 when the authorize function refuses', async () => {
            const res = await get('authorize').set('authorization', hmacToken('user'));

            expect(res.status).toBe(403);
            expect(handlerRuns.count).toBe(0);
        });

        it('should run the handler when the authorize function allows', async () => {
            const res = await get('authorize').set('authorization', hmacToken('admin'));

            expect(res.status).toBe(200);
        });
    });

    describe('cookie option', () => {
        it('should return 401 for an invalid cookie', async () => {
            const res = await get('cookie').set('Cookie', 'xAuthToken=garbage');

            expect(res.status).toBe(401);
            expect(handlerRuns.count).toBe(0);
        });

        it('should return 401 when the cookie is missing', async () => {
            const res = await get('cookie');

            expect(res.status).toBe(401);
            expect(handlerRuns.count).toBe(0);
        });

        it('should accept a valid cookie', async () => {
            const res = await get('cookie').set('Cookie', `xAuthToken=${hmacToken()}`);

            expect(res.status).toBe(200);
        });
    });

    describe('RSA apps that forget the algorithm option', () => {
        const message = "pass { algorithm: 'RS256' }";

        it('should refuse to start with a key path as the HMAC secret', () => {
            expect(() => jwtAuth(PUBLIC_KEY_PATH)).toThrow(message);
        });

        it('should not put the value in the error', () => {
            expect(() => jwtAuth(PUBLIC_KEY_PATH)).not.toThrow(PUBLIC_KEY_PATH);
        });

        it('should still accept normal secrets', () => {
            expect(() => jwtAuth(SECRET)).not.toThrow();
            expect(() => jwtAuth('a'.repeat(5000))).not.toThrow();
        });
    });

    it('should only respond once to a rejected request', async () => {
        const errors: Error[] = [];
        const onError = (error: Error) => errors.push(error);
        process.on('uncaughtException', onError);

        await get('hmac').set('authorization', 'garbage');
        await new Promise((resolve) => setTimeout(resolve, 30));

        process.off('uncaughtException', onError);
        expect(errors).toEqual([]);
    });
});
