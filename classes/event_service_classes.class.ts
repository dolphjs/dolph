import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Dolph } from '../common';
import { getInjectedService } from '../core';
import { SocketService } from '../packages';
import { Server } from 'socket.io';

abstract class DolphSocketServiceHandler<_T extends Dolph = Dolph> {
    private _socketService?: SocketService;

    public get socketService(): SocketService {
        if (!this._socketService) {
            // @ts-expect-error legacy typing compatibility
            this._socketService = getInjectedService(SocketService.name);
        }
        return this._socketService;
    }

    public get socket(): Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
        return this.socketService.getSocket();
    }
}

export { DolphSocketServiceHandler };
