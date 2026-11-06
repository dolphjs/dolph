import { IncomingMessage, Server, ServerResponse } from 'http';
import { ServerOptions, Socket } from 'socket.io';
import { SocketComponent, SocketService } from '../../packages';

export type SocketMiddleware = (socket: Socket, next: (error?: Error) => void) => unknown;

export interface DSocket {
    server: Server<typeof IncomingMessage, typeof ServerResponse>;
    options?: Partial<ServerOptions>;
    /**
     * Runs on every connection, in every namespace. Use `socketJwtAuth(secret)` or your
     * own middleware. Set to `false` for sockets that are public on purpose.
     */
    auth?: SocketMiddleware | SocketMiddleware[] | false;
}

export interface DSocketInit {
    options?: Partial<ServerOptions>;
    component: SocketComponent;
    socketService?: typeof SocketService;
    auth?: DSocket['auth'];
}
