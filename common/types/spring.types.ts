import { DolphControllerHandler, DolphServiceHandler, DolphSocketServiceHandler } from '../../classes';
import { DNextFunc, DRequest, DResponse } from '../../common/interfaces';
import { Dolph } from './dolph.types';

export type Middleware = (req: DRequest, res: DResponse, next: DNextFunc) => void;

export type ComponentParams<T extends Dolph> = {
    controllers: Array<{ new (): DolphControllerHandler<T> }>;
    services?: Array<{ new (...args: any[]): {} }>;
};

export type DolphComponent<T extends DolphControllerHandler<Dolph>> = {
    controllers: Array<{ new (): T }>;
};

export type SocketServicesParams<T extends Dolph> = {
    services?: Array<{ new (): DolphServiceHandler<T> }>;
    socketServices?: Array<{ new (): DolphSocketServiceHandler<T> }>;
};
