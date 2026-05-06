import { IncomingMessage, Server, ServerResponse } from 'http';
import { ServerOptions } from 'socket.io';
import { SocketComponent, SocketService } from '../../packages';

export interface DSocket {
    server: Server<typeof IncomingMessage, typeof ServerResponse>;
    options?: Partial<ServerOptions>;
}

export interface DSocketInit {
    options?: Partial<ServerOptions>;
    component: SocketComponent;
    socketService?: typeof SocketService;
}
