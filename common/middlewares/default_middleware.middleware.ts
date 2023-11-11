import { NextFunction, Request, Response } from 'express';
import { DNextFunc, DRequest, DResponse } from '../interfaces';

const DolphAsyncMiddleware =
  <DolphMiddleware>(fn: (req: DRequest, res: DResponse, next: DNextFunc) => Promise<DolphMiddleware>) =>
  (req: DRequest, res: DResponse, next: DNextFunc) => {};

/**
 *
 * Creates a function that can be used for as an express middleware function
 */
const DefaultMiddleware = (fn: any) => (req: DRequest, res: DResponse, next: DNextFunc) => {};

/**
 *
 * Creates an asyncfunction wrapped in a try-catch block which can be used  an express middleware function
 */
function DefaultAsyncMiddleware(fn: (...args: any[]) => Promise<void>): (...args: any[]) => void {
  return function (...args: any[]) {
    const [req, res, next] = args;
    Promise.resolve(fn(...args)).catch((err) => next(err));
  };
}

export { DefaultAsyncMiddleware, DefaultMiddleware, DolphAsyncMiddleware };
