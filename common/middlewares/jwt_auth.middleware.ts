import { TryCatchAsyncFn } from '.';
import { JwtBasicAuth } from '../../classes';
import { DNextFunc, DRequest, DResponse } from '../interfaces';

/**
 *
 * Takes the `JwtBasicAuth` class as parameter and calls the Verify method to perform Authorization
 *
 * Passes the payload to the request body as `req.payload`
 *  - see `IPayload` interface to see the design of the payload object
 */
function JwtAuthMiddleware(jwtBasicAuthInstance: JwtBasicAuth) {
  return TryCatchAsyncFn(async (req: DRequest, res: DResponse, next: DNextFunc) => {
    const payload = await jwtBasicAuthInstance.Verify(req, res, next);
    //@ts-expect-error
    req.payload = payload;
    next();
  });
}

export { JwtAuthMiddleware };
