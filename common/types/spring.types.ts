import { DolphControllerHandler } from 'classes';
import { DNextFunc, DRequest, DResponse } from '../../common/interfaces';
import { Dolph } from './dolph.types';

export type Middleware = (req: DRequest, res: DResponse, next: DNextFunc) => void;

export type ComponentParams<T extends Dolph> = {
  controllers: Array<{ new (): DolphControllerHandler<T> }>;
};

export type ShieldParams<T extends Dolph> = {};

export type DolphComponent<T extends DolphControllerHandler<Dolph>> = {
  controllers: Array<{ new (): T }>;
};
