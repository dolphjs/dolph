import { Request, Response, NextFunction } from 'express';

const TryCatchAsyncFn =
  <TryCatchAsyncFn>(fn: (req: Request, res: Response, next: NextFunction) => Promise<TryCatchAsyncFn>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

const TryCatchFn =
  (fn: (req: Request, res: Response, next: NextFunction) => void) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

export { TryCatchAsyncFn, TryCatchFn };
