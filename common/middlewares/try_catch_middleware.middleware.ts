import { Request, Response, NextFunction } from 'express';

const TryCatchAsyncFn =
  <TryCatchAsyncFn>(fn: (req: Request, res: Response, next: NextFunction) => Promise<TryCatchAsyncFn>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

const TryCatchAsyncDec = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const context = this;
    // console.log(this);
    const [req, res, next] = args;
    try {
      await originalMethod.apply(context, args);
    } catch (err) {
      next(err);
    }
  };

  // return descriptor;
};

const TryCatchFn =
  (fn: (req: Request, res: Response, next: NextFunction) => void) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

export { TryCatchAsyncFn, TryCatchFn, TryCatchAsyncDec };
