import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Dolph } from '../common';
import { getInjectedService } from '../core';
import { SocketService } from '../packages';
import { Server } from 'socket.io';

abstract class DolphSocketServiceHandler<_T extends Dolph> {
    private _socketService?: SocketService;
    public socket?: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

    public get socketService(): SocketService {
        if (!this._socketService) {
            // @ts-expect-error legacy typing compatibility
            this._socketService = getInjectedService(SocketService.name);
            this.initSocketEvents();
        }
        return this._socketService;
    }

    private initSocketEvents(): void {
        this.socket = this.socketService.getSocket();
    }
}

export { DolphSocketServiceHandler };
