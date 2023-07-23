import { RequestHandler } from 'express';

export type DolphMiddlewareFn = (middlewares: RequestHandler[]) => void;
