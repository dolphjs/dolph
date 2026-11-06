import type { ServerOptions } from 'socket.io';
import { DolphSocketServiceHandler } from '../classes';
import { Dolph } from '../common';
import { startSocketApp } from './utils/socket_app';

class OpenSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.socket.on('connection', () => undefined);
    }
}

const EVIL = 'https://evil.example.com';
const APP = 'https://app.example.com';

describe('Socket origin checks', () => {
    const attempt = async (options: Partial<ServerOptions> | undefined, origin?: string) => {
        const app = await startSocketApp(OpenSocketService, { auth: false, options });

        try {
            await app.connect(origin ? { extraHeaders: { Origin: origin } } : {});
            return 'connected';
        } catch {
            return 'refused';
        } finally {
            await app.close();
        }
    };

    it.each<[string, Partial<ServerOptions> | undefined, string | undefined, string]>([
        ['no cors, cross-site browser', undefined, EVIL, 'refused'],
        ['no cors, non-browser client', undefined, undefined, 'connected'],
        ['a listed origin', { cors: { origin: APP } }, APP, 'connected'],
        ['an unlisted origin', { cors: { origin: APP } }, EVIL, 'refused'],
        ['a list containing it', { cors: { origin: [EVIL, APP] } }, APP, 'connected'],
        ['a list without it', { cors: { origin: [APP] } }, EVIL, 'refused'],
        ['a matching regex', { cors: { origin: /\.example\.com$/ } }, APP, 'connected'],
        ['a regex that does not match', { cors: { origin: /^https:\/\/app\./ } }, EVIL, 'refused'],
        ['an explicit *', { cors: { origin: '*' } }, EVIL, 'connected'],
        ['cors with no origin, cross-site browser', { cors: {} }, EVIL, 'refused'],
        ['a malformed origin', undefined, 'not a url', 'refused'],
    ])('should handle %s', async (_name, options, origin, expected) => {
        await expect(attempt(options, origin)).resolves.toBe(expected);
    });

    it('should allow a page on the same host', async () => {
        const app = await startSocketApp(OpenSocketService, { auth: false });

        await expect(app.connect({ extraHeaders: { Origin: app.url } })).resolves.toBeDefined();
        await app.close();
    });

    it('should support an origin function', async () => {
        const origin = (value: string, callback: (error: Error | null, allowed?: boolean) => void) =>
            callback(null, value === APP);

        await expect(attempt({ cors: { origin } }, APP)).resolves.toBe('connected');
        await expect(attempt({ cors: { origin } }, EVIL)).resolves.toBe('refused');
    });

    it('should refuse the connection when an origin function fails', async () => {
        const origin = (_value: string, callback: (error: Error | null) => void) => callback(new Error('lookup failed'));

        await expect(attempt({ cors: { origin } }, APP)).resolves.toBe('refused');
    });

    it('should let a custom allowRequest decide', async () => {
        const allowRequest: ServerOptions['allowRequest'] = (_req, callback) => callback(null, true);

        await expect(attempt({ allowRequest }, EVIL)).resolves.toBe('connected');
    });

    it('should apply to the polling transport too', async () => {
        const app = await startSocketApp(OpenSocketService, { auth: false });

        await expect(
            app.connect({ transports: ['polling'], extraHeaders: { Origin: EVIL } }),
        ).rejects.toThrow();
        await app.close();
    });
});
