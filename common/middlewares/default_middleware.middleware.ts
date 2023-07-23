import { catchAsync } from '@dolphjs/core';
import { NextFunction, Request, Response } from 'express';

const DefaultAsyncMiddleware =
  <DolphMiddleware>(fn: (req: Request, res: Response, next: NextFunction) => Promise<DolphMiddleware>) =>
  (req: Request, res: Response, next: NextFunction) => {};

const DefaultMiddleware = (fn: any) => (req: Request, res: Response, next: NextFunction) => {};

export { DefaultAsyncMiddleware, DefaultMiddleware };
