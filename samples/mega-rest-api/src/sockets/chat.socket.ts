import { DolphSocketServiceHandler } from '../../../../classes';
import { Dolph } from '../../../../common';
import { RealtimeAuditService } from './realtime.service';

export class ChatSocketService extends DolphSocketServiceHandler<Dolph> {
    private RealtimeAuditService: RealtimeAuditService;

    constructor() {
        super();
        this.socketService;
        this.register();
    }

    private register() {
        this.socket.on('connection', (socket) => {
            console.log('[socket] chat connected:', socket.id);
            socket.emit('chat:ready', { id: socket.id });

            socket.on('chat:message', (data) => {
                console.log('[socket] chat:message', data);
                const tracked = this.RealtimeAuditService.track('chat:message', data);
                this.socket.emit('chat:broadcast', tracked);
            });
            socket.on('disconnect', (reason) => {
                console.log('[socket] chat disconnected:', socket.id, reason);
            });
        });
    }
}
