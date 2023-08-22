import { NextFunction, Request, Response } from 'express';
import { ErrorException, TryCatchAsyncFn } from '..';
import { httpStatus } from '@dolphjs/core';
import { IPayload } from '../interfaces';
import { verifyJWTwithHMAC, verifyJWTwithRSA } from '../utilities/auth';

const authHeaderName: Array<string> = ['x-auth-token', 'authorization'];

// Authorization - used when it's just secret used
// x-auth-token - used when it's private and public keys being used
class JwtBasicAuth {
  tokenSecret: string;
  constructor(tokenSecret: string) {
    this.tokenSecret = tokenSecret;
  }

  Verify = TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
    let authToken: string | string[];
    let authHeader: string;
    authHeaderName.forEach((headerName) => {
      if (req.headers[headerName]) {
        authToken = req.headers[headerName];
        authHeader = headerName;
      }
    });
    if (authToken === '' || !authToken?.length)
      return next(new ErrorException(httpStatus.UNAUTHORIZED, 'provide a valid token header'));
    let payload: IPayload;
    if (authHeader === 'Authorization') {
      //@ts-expect-error
      payload = verifyJWTwithHMAC({ token: authToken, secret: this.tokenSecret });
    } else if (authHeader === 'x-auth-token') {
      //@ts-expect-error
      payload = verifyJWTwithRSA({ pathToPublicKey: this.tokenSecret, token: authToken });
    }

    return payload;
  });
}

class JwtAuthDec {
  Verify(tokenSecret: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
        let authToken: string | string[];
        let authHeader: string;

        if (req.headers[authHeaderName[0]]) {
          authToken = req.headers[authHeaderName[0]];
          authHeader = authHeaderName[0];
        } else if (req.headers[authHeaderName[1]]) {
          authToken = req.headers[authHeaderName[1]];
          authHeader = authHeaderName[1];
        }

        if (authToken === '' || !authToken?.length)
          return next(new ErrorException(httpStatus.UNAUTHORIZED, 'provide a valid token header'));

        let payload: IPayload;
        if (authHeader === 'Authorization') {
          //@ts-expect-error
          payload = verifyJWTwithHMAC({ token: authToken, secret: tokenSecret });
        } else if (authHeader === 'x-auth-token') {
          //@ts-expect-error
          payload = verifyJWTwithRSA({ pathToPublicKey: tokenSecret, token: authToken });
        }

        //@ts-expect-error
        req.payload = payload;

        return originalMethod.apply(this, [req, res, next]);
      };

      return descriptor;
    };
  }
}

export { JwtBasicAuth, JwtAuthDec };
