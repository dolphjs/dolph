import type { Socket } from 'socket.io';
import { DolphSocketServiceHandler } from '../classes';
import { Dolph } from '../common';
import { logger } from '../utilities';
import { startSocketApp } from './utils/socket_app';

const payloads: { text: string }[] = [];

class FragileSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        const io = this.socketService.getSocket();
        const register = (socket: Socket) => {
            socket.on('sync-throw', (data: { text: string }) => payloads.push({ text: data.text.toUpperCase() }));
            socket.on('async-reject', async () => {
                await Promise.resolve();
                throw new Error('db down');
            });
            socket.once('once-throw', () => {
                throw new Error('once failed');
            });
            socket.on('with-ack', (_data: unknown, ack: (reply: unknown) => void) => {
                ack(undefined);
                throw new Error('after ack');
            });
            socket.on('throw-before-ack', (_data: unknown, _ack: (reply: unknown) => void) => {
                throw new Error('before ack');
            });
            socket.onAny((event: string) => {
                if (event === 'any-throw') throw new Error('any failed');
            });
            socket.on('ping-check', (_data: unknown, ack: (reply: string) => void) => ack('alive'));

            const removable = () => socket.emit('removed-ran');
            socket.on('remove-me', removable);
            socket.on('remove-now', (_data: unknown, ack: () => void) => {
                socket.off('remove-me', removable);
                ack();
            });
        };

        io.on('connection', register);
        io.of('/static').on('connection', register);
        io.of(/^\/dynamic-\w+$/).on('connection', register);
        io.of('/bad-connect').on('connection', () => {
            throw new Error('connection failed');
        });
    }
}

describe('Socket handler failures', () => {
    let app: Awaited<ReturnType<typeof startSocketApp>>;
    let errors: jest.SpyInstance;

    beforeAll(async () => {
        app = await startSocketApp(FragileSocketService, { auth: false });
    });

    beforeEach(() => {
        errors = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    });

    afterEach(() => errors.mockRestore());

    afterAll(() => app.close());

    const stillAlive = async (client: Awaited<ReturnType<typeof app.connect>>) => {
        await expect(client.timeout(1000).emitWithAck('ping-check', {})).resolves.toBe('alive');
    };

    it.each([
        ['a sync throw from a bad payload', 'sync-throw', undefined, "'sync-throw' failed"],
        ['a rejected async handler', 'async-reject', {}, "'async-reject' failed: db down"],
        ['a throw inside once()', 'once-throw', {}, 'once failed'],
        ['a throw inside onAny()', 'any-throw', {}, 'any failed'],
    ])('should survive %s and log it', async (_name, event, payload, message) => {
        const client = await app.connect();

        client.emit(event, payload);

        await stillAlive(client);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(errors).toHaveBeenCalledWith(expect.stringContaining(message));
    });

    it('should stay up for other clients when one client breaks a handler', async () => {
        const attacker = await app.connect();
        const bystander = await app.connect();

        attacker.emit('sync-throw');

        await stillAlive(bystander);
    });

    it('should answer the client when a handler with an ack fails', async () => {
        const client = await app.connect();

        const reply = await client.timeout(1000).emitWithAck('throw-before-ack', {});

        expect(reply).toEqual({ error: 'Internal Server Error' });
    });

    it('should not hide the failure when the ack was already sent', async () => {
        const client = await app.connect();

        await client.timeout(1000).emitWithAck('with-ack', {});
        await stillAlive(client);

        expect(errors).toHaveBeenCalledWith(expect.stringContaining('after ack'));
    });

    it.each([
        ['a namespace from io.of(name)', '/static'],
        ['a dynamic namespace from io.of(regex)', '/dynamic-room'],
    ])('should guard handlers on %s', async (_name, namespace) => {
        const client = await app.connect({}, namespace);

        client.emit('sync-throw');

        await stillAlive(client);
    });

    it('should guard a failing connection handler', async () => {
        const client = await app.connect({}, '/bad-connect');
        const main = await app.connect();

        expect(client.connected).toBe(true);
        await stillAlive(main);
    });

    it('should keep off() working with the original function', async () => {
        const client = await app.connect();
        const ran = jest.fn();
        client.on('removed-ran', ran);

        await client.timeout(1000).emitWithAck('remove-now', {});
        client.emit('remove-me');
        await stillAlive(client);

        expect(ran).not.toHaveBeenCalled();
    });
});
