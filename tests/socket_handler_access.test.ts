import { DolphSocketServiceHandler } from '../classes';
import { Dolph } from '../common';
import { startSocketApp } from './utils/socket_app';

// Written the way the docs show it, without touching socketService first.
class DocsExampleSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.socket.on('connection', (socket) => {
            socket.emit('ready', { ok: true });
        });
    }
}

describe('DolphSocketServiceHandler', () => {
    it('should allow this.socket straight away in the constructor', async () => {
        const app = await startSocketApp(DocsExampleSocketService, { auth: false });

        const client = await app.connect();

        expect(client.connected).toBe(true);
        await app.close();
    });
});
