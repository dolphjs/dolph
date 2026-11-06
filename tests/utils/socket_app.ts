import { AddressInfo } from 'net';
import { io as ioClient, ManagerOptions, Socket as ClientSocket, SocketOptions } from 'socket.io-client';
import { DolphFactory } from '../../core';
import { Socket } from '../../decorators';
import { DSocketInit } from '../../common/interfaces/socket.interfaces';
import { SocketComponent } from '../../packages';

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

    process.env.PORT = '0';

    const dolph = new DolphFactory([], { sockets: { component: new TestSocketComponent(), ...init } });
    const server = await dolph.start();

    delete process.env.PORT;

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
        await dolph.stop();
        jest.restoreAllMocks();
    };

    return { connect, close, dolph, url };
};
