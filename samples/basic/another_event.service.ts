import { DolphSocketServiceHandler } from '../../classes';
import { Dolph } from '../../common';

export class AnotherEventService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.socketService;
        this.handleEvents();
    }

    private handleEvents() {
        this.socket.on('connection', (socket) => {
            socket.emit('connected', 'connection successful');
            socket.on('new-user-two', (message) => {
                this.socket.emit('new-user-two', message);
            });
        });
    }
}
