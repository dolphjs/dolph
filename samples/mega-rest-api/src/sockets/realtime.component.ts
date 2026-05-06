import { Socket } from '../../../../decorators';
import { SocketComponent } from '../../../../packages';
import { ChatSocketService } from './chat.socket';
import { NotificationSocketService } from './notifications.socket';
import { RealtimeAuditService } from './realtime.service';

@Socket({
    services: [RealtimeAuditService],
    socketServices: [ChatSocketService, NotificationSocketService],
})
export class RealtimeComponent extends SocketComponent {}
