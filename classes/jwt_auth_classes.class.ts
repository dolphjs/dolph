import { DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload, TryCatchAsyncFn } from '../common';
import { verifyJWTwithHMAC, verifyJWTwithRSA } from '../utilities';
import { config } from 'dotenv';
config();

const authHeaderName: Array<string> = ['x-auth-token', 'authorization'];

/**
 * Takes a `tokenSecret` parameter
 *
 * The Verify method is used to verify JWT token/ private key
 */
// Authorization - used when it's just secret used
// x-auth-token - used when it's private and public keys being used
class JwtBasicAuth {
  tokenSecret: string;
  constructor(tokenSecret: string) {
    this.tokenSecret = tokenSecret;
  }

  Verify = TryCatchAsyncFn(async (req: DRequest, res: DResponse, next: DNextFunc) => {
    let authToken: string | string[];
    let authHeader: string;
    authHeaderName.forEach((headerName) => {
      if (req.headers[headerName]) {
        authToken = req.headers[headerName];
        authHeader = headerName;
      }
    });
    if (authToken === '' || !authToken?.length) {
      return next(new ErrorException('provide a valid token header', HttpStatus.UNAUTHORIZED));
    }
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

/**
 *
 * class-method decorator used for authorization based on the dolphjs default JWT authentication and authorization design
 *
 * @version 1.0.4
 */
const JWTAuthVerifyDec = (tokenSecret: string) => {
  return (_target: any, _propertyKey: string, descriptor?: TypedPropertyDescriptor<any>) => {
    const originalMethod = descriptor.value;

    // convert to normal func
    descriptor.value = (req: DRequest, res: DResponse, next: DNextFunc) => {
      try {
        const context = this;
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
          return next(new ErrorException('provide a valid token header', HttpStatus.UNAUTHORIZED));

        let payload: IPayload;
        if (authHeader === authHeaderName[1]) {
          //@ts-expect-error
          payload = verifyJWTwithHMAC({ token: authToken, secret: tokenSecret });
        } else if (authHeader === authHeaderName[0]) {
          //@ts-expect-error
          payload = verifyJWTwithRSA({ pathToPublicKey: tokenSecret, token: authToken });
        }
        req.payload = payload;

        return originalMethod.apply(context, [req, res, next]);
      } catch (e) {
        throw e;
      }
    };

    // return descriptor;
  };
};

export { JwtBasicAuth, JWTAuthVerifyDec };
