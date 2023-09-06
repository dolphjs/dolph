import { NextFunction, Request, Response } from 'express';
import { TryCatchAsyncFn } from '.';
import { JwtBasicAuth } from '..';

/**
 *
 * Takes the `JwtBasicAuth` class as parameter and calls the Verify method to perform Authorization
 *
 * Passes the payload to the request body as `req.payload`
 *  - see `IPayload` interface to see the design of the payload object
 */
function JwtAuthMiddleware(jwtBasicAuthInstance: JwtBasicAuth) {
  return TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
    const payload = await jwtBasicAuthInstance.Verify(req, res, next);
    //@ts-expect-error
    req.payload = payload;
    next();
  });
}

export { JwtAuthMiddleware };
