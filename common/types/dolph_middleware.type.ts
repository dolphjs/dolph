import { DRequestHandler } from '../interfaces';

export type DolphMiddlewareFn = (middlewares: DRequestHandler[]) => void;
