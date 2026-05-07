import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { DolphFactory } from '../core';
import { DolphSocketServiceHandler } from '../classes';
import { Dolph } from '../common';
import { Socket } from '../decorators';
import { SocketComponent, SocketService } from '../packages';

class SmokePingSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.register();
    }

    private register() {
        const io = this.socketService.getSocket();
        io.on('connection', (socket) => {
            socket.emit('smoke:hello', { ok: true });
            socket.on('smoke:ping', () => {
                socket.emit('smoke:pong', { from: 'server' });
            });
        });
    }
}

@Socket({
    services: [],
    socketServices: [SmokePingSocketService],
})
class SmokeSocketComponent extends SocketComponent {}

describe('Socket.IO bootstrap smoke', () => {
    let server: any;
    let client: ClientSocket;
    let baseUrl: string;

    beforeAll(async () => {
        const app = new DolphFactory([], {
            socketService: SocketService,
            component: new SmokeSocketComponent(),
        });
        server = app.start();
        await new Promise<void>((resolve) => {
            server.once('listening', resolve);
        });
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        client = ioClient(baseUrl, { transports: ['websocket'], reconnection: false });
        await new Promise<void>((resolve, reject) => {
            client.once('connect', () => resolve());
            client.once('connect_error', (err) => reject(err));
        });
    });

    afterAll(async () => {
        client?.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('emits handshake event from server on connect', async () => {
        await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('smoke:hello timeout')), 8000);
            const c = ioClient(baseUrl, { transports: ['websocket'], reconnection: false });
            c.once('smoke:hello', (payload: { ok?: boolean }) => {
                clearTimeout(t);
                expect(payload.ok).toBe(true);
                c.close();
                resolve();
            });
            c.once('connect_error', (err) => {
                clearTimeout(t);
                reject(err);
            });
        });
    });

    it('round-trips smoke:ping via socket.emit', async () => {
        await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('smoke:pong timeout')), 8000);
            client.once('smoke:pong', (payload: { from?: string }) => {
                clearTimeout(t);
                expect(payload.from).toBe('server');
                resolve();
            });
            client.emit('smoke:ping');
        });
    });
});
