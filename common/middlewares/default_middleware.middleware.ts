import { NextFunction, Request, Response } from 'express';

const DolphAsyncMiddleware =
  <DolphMiddleware>(fn: (req: Request, res: Response, next: NextFunction) => Promise<DolphMiddleware>) =>
  (req: Request, res: Response, next: NextFunction) => {};

const DefaultMiddleware = (fn: any) => (req: Request, res: Response, next: NextFunction) => {};

function DefaultAsyncMiddleware(fn: (...args: any[]) => Promise<void>): (...args: any[]) => void {
  return function (...args: any[]) {
    const [req, res, next] = args;
    Promise.resolve(fn(...args)).catch((err) => next(err));
  };
}

export { DefaultAsyncMiddleware, DefaultMiddleware, DolphAsyncMiddleware };
