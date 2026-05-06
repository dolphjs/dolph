import { DolphSocketServiceHandler } from '../../../../classes';
import { Dolph } from '../../../../common';

export class NotificationSocketService extends DolphSocketServiceHandler<Dolph> {
    constructor() {
        super();
        this.socketService;
        this.register();
    }

    private register() {
        this.socket.on('connection', (socket) => {
            console.log('[socket] notification connected:', socket.id);
            socket.emit('notification:welcome', {
                id: socket.id,
                message: 'Realtime notifications connected',
            });

            socket.on('notification:ping', (body) => {
                console.log('[socket] notification:ping', body);
                socket.emit('notification:pong', {
                    now: Date.now(),
                    body,
                });
            });
            socket.on('disconnect', (reason) => {
                console.log('[socket] notification disconnected:', socket.id, reason);
            });
        });
    }
}
