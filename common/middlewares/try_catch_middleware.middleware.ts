import { Request, Response, NextFunction } from 'express';

const TryCatchAsync =
  <TryCatchAsyncFn>(fn: (req: Request, res: Response, next: NextFunction) => Promise<TryCatchAsyncFn>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

export { TryCatchAsync };
