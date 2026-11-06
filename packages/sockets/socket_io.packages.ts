import { Service } from 'typedi';
import type { Server as SocketServer } from 'socket.io';
import { DSocket } from '../../common/interfaces/socket.interfaces';
import { inAppLogger } from '../../utilities';
import clc from 'cli-color';
import { forEachNamespace, guardSocketHandlers } from './socket_guard';

const applySocketAuth = (io: SocketServer, auth: DSocket['auth']) => {
    if (auth === undefined) {
        inAppLogger.warn(
            clc.yellow(
                'Socket connections have no authentication, so anyone can connect. Set `auth` in the socket config, for example `socketJwtAuth(secret)`, or `auth: false` if they are public on purpose.',
            ),
        );
    }

    if (!auth) return;

    // io.use() only covers one namespace, which would leave io.of('/admin') open.
    forEachNamespace(io, (namespace) => [auth].flat().forEach((middleware) => namespace.use(middleware)));
};

@Service()
export class SocketService {
    private socketIo: SocketServer;

    constructor(params: DSocket) {
        // Loaded here so apps without sockets never pay to import socket.io.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Server } = require('socket.io') as typeof import('socket.io');
        this.socketIo = new Server(params.server, params.options);
        guardSocketHandlers(this.socketIo);
        applySocketAuth(this.socketIo, params.auth);
    }

    public getSocket(): SocketServer {
        return this.socketIo;
    }
}
