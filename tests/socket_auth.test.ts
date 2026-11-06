import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import jwt from 'jsonwebtoken';
import { DolphSocketServiceHandler, socketJwtAuth } from '../classes';
import { Dolph, SocketMiddleware } from '../common';
import { logger } from '../utilities';
import { startSocketApp } from './utils/socket_app';

const SECRET = 'socket-secret';

class WhoAmISocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        const io = this.socketService.getSocket();
        const register = (socket: Parameters<Parameters<typeof io.on>[1]>[0]) => {
            socket.on('whoami', (ack: (payload: unknown) => void) => ack(socket.data.payload ?? null));
        };

        io.on('connection', register);
        io.of('/admin').on('connection', register);
        io.of(/^\/room-\w+$/).on('connection', register);
    }
}

const token = (sub = 'user') => jwt.sign({ sub }, SECRET);

describe('socketJwtAuth', () => {
    let app: Awaited<ReturnType<typeof startSocketApp>>;

    beforeAll(async () => {
        app = await startSocketApp(WhoAmISocketService, { auth: socketJwtAuth(SECRET) });
    });

    afterAll(() => app.close());

    it.each([
        ['no token', {}],
        ['a garbage token', { auth: { token: 'garbage' } }],
        ['a token signed with another secret', { auth: { token: jwt.sign({ sub: 'x' }, 'wrong') } }],
        ['an unsigned token', { auth: { token: jwt.sign({ sub: 'x' }, '', { algorithm: 'none' }) } }],
        ['an expired token', { auth: { token: jwt.sign({ sub: 'x' }, SECRET, { expiresIn: -10 }) } }],
    ])('should refuse %s with the same message', async (_name, options) => {
        await expect(app.connect(options)).rejects.toThrow('unauthorized');
    });

    it('should accept a token from the auth option and expose the payload', async () => {
        const client = await app.connect({ auth: { token: token('alice') } });

        await expect(client.timeout(1000).emitWithAck('whoami')).resolves.toMatchObject({ sub: 'alice' });
    });

    it('should accept a token from the authorization header', async () => {
        const client = await app.connect({ extraHeaders: { authorization: token('bob') } });

        await expect(client.timeout(1000).emitWithAck('whoami')).resolves.toMatchObject({ sub: 'bob' });
    });

    it.each([['/admin'], ['/room-1']])('should also protect the %s namespace', async (namespace) => {
        await expect(app.connect({}, namespace)).rejects.toThrow('unauthorized');

        const client = await app.connect({ auth: { token: token('carol') } }, namespace);
        await expect(client.timeout(1000).emitWithAck('whoami')).resolves.toMatchObject({ sub: 'carol' });
    });
});

describe('socketJwtAuth with RSA', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dolph-socket-'));
    const publicKeyPath = join(directory, 'public.pem');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    writeFileSync(publicKeyPath, publicKey);

    afterAll(() => rmSync(directory, { recursive: true, force: true }));

    it('should accept RS256 tokens and refuse one forged with the key path', async () => {
        const app = await startSocketApp(WhoAmISocketService, {
            auth: socketJwtAuth(publicKeyPath, { algorithm: 'RS256' }),
        });

        await expect(app.connect({ auth: { token: jwt.sign({ sub: 'x' }, publicKeyPath) } })).rejects.toThrow(
            'unauthorized',
        );

        const client = await app.connect({ auth: { token: jwt.sign({ sub: 'dan' }, privateKey, { algorithm: 'RS256' }) } });
        await expect(client.timeout(1000).emitWithAck('whoami')).resolves.toMatchObject({ sub: 'dan' });
        await app.close();
    });

    it('should refuse to start with a key path as an HMAC secret', () => {
        expect(() => socketJwtAuth(publicKeyPath)).toThrow("pass { algorithm: 'RS256' }");
    });
});

describe('Custom socket auth', () => {
    beforeEach(() => {
        jest.spyOn(logger, 'error').mockImplementation(() => logger);
    });

    it.each<[string, SocketMiddleware]>([
        [
            'throws',
            () => {
                throw new Error('auth service down');
            },
        ],
        ['rejects', async () => Promise.reject(new Error('auth service down'))],
    ])('should refuse the connection when it %s', async (_name, middleware) => {
        const app = await startSocketApp(WhoAmISocketService, { auth: middleware });

        await expect(app.connect()).rejects.toThrow('unauthorized');
        await app.close();
    });

    it('should run every middleware in a list', async () => {
        const calls: string[] = [];
        const step = (name: string): SocketMiddleware => (_socket, next) => {
            calls.push(name);
            next();
        };
        const app = await startSocketApp(WhoAmISocketService, { auth: [step('first'), step('second')] });

        await app.connect();

        expect(calls).toEqual(['first', 'second']);
        await app.close();
    });
});

describe('Boot warning', () => {
    const warnings = () => {
        const spy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
        return () => spy.mock.calls.flat().filter((message) => String(message).includes('no authentication'));
    };

    it('should warn when no auth is configured, and still let clients connect', async () => {
        const read = warnings();
        const app = await startSocketApp(WhoAmISocketService);

        const client = await app.connect();

        expect(read()).toHaveLength(1);
        expect(client.connected).toBe(true);
        await app.close();
    });

    it.each([
        ['auth is false', { auth: false as const }],
        ['auth is configured', { auth: socketJwtAuth(SECRET) }],
    ])('should not warn when %s', async (_name, init) => {
        const read = warnings();
        const app = await startSocketApp(WhoAmISocketService, init);

        expect(read()).toHaveLength(0);
        await app.close();
    });
});
