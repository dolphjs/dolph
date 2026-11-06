import { DolphSocketServiceHandler } from '../../classes';
import { DRequestHandler } from '../../common/interfaces';
import { Dolph } from './dolph.types';

export type Middleware = DRequestHandler;

// Constructor arguments can be anything, because the framework resolves them through DI.
type ClassType<T = object> = new (...args: any[]) => T;

export type ComponentParams<_T extends Dolph> = {
    controllers: ClassType[];
    services?: ClassType<unknown>[];
};

export type DolphComponent<T extends object> = {
    controllers: ClassType<T>[];
};

export type SocketServicesParams<T extends Dolph> = {
    services?: ClassType<unknown>[];
    socketServices?: Array<{ new (): DolphSocketServiceHandler<T> }>;
};
