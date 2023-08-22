import { NextFunction, Request, Response } from 'express';
import { TryCatchAsyncFn } from '.';
import { JwtBasicAuth } from '..';

function JwtAuthMiddleware(jwtBasicAuthInstance: JwtBasicAuth) {
  return TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
    const payload = await jwtBasicAuthInstance.Verify(req, res, next);
    //@ts-expect-error
    req.payload = payload;
    next();
  });
}

export { JwtAuthMiddleware };
