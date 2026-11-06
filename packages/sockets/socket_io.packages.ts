import { Service } from 'typedi';
import type { Server as SocketServer } from 'socket.io';
import { DSocket } from '../../common/interfaces/socket.interfaces';

@Service()
export class SocketService {
    private socketIo: SocketServer;

    constructor(params: DSocket) {
        // Loaded here so apps without sockets never pay to import socket.io.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Server } = require('socket.io') as typeof import('socket.io');
        this.socketIo = new Server(params.server, params.options);
    }

    public getSocket(): SocketServer {
        return this.socketIo;
    }
}
