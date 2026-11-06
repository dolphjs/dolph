import { Server } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, ManagerOptions, Socket as ClientSocket, SocketOptions } from 'socket.io-client';
import { DolphFactory } from '../../core';
import { Socket } from '../../decorators';
import { DSocketInit } from '../../common/interfaces/socket.interfaces';
import { SocketComponent, SocketService } from '../../packages';

type ClientOptions = Partial<ManagerOptions & SocketOptions>;

/**
 * Boots a real server for one socket service. `process.on` is mocked because start()
 * installs handlers that would exit the test runner, and leak between files.
 */
export const startSocketApp = async (
    socketService: Parameters<typeof Socket>[0]['socketServices'][number],
    init: Partial<DSocketInit> = {},
) => {
    jest.spyOn(process, 'on').mockImplementation(() => process);

    class TestSocketComponent extends SocketComponent {}
    Socket({ services: [], socketServices: [socketService] })(TestSocketComponent);

    const dolph = new DolphFactory([], { socketService: SocketService, component: new TestSocketComponent(), ...init });
    dolph.port = 0;

    const server: Server = dolph.start();
    await new Promise((resolve) => server.once('listening', resolve));

    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const clients: ClientSocket[] = [];

    const connect = (options: ClientOptions = {}, namespace = '') =>
        new Promise<ClientSocket>((resolve, reject) => {
            const client = ioClient(`${url}${namespace}`, { transports: ['websocket'], reconnection: false, ...options });
            clients.push(client);
            client.once('connect', () => resolve(client));
            client.once('connect_error', reject);
        });

    const close = async () => {
        clients.forEach((client) => client.close());
        await dolph.socket()?.getSocket().close();
        jest.restoreAllMocks();
    };

    return { connect, close, dolph };
};
