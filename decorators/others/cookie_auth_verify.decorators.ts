import { DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload } from '../../common';
import { verifyJWTwithHMAC } from '../../utilities';

//TODO: duplicate as function so it'll be available for javasctipt

/**
 *
 * class-method decorator used for authorization based on the dolphjs default cookie authentication and authorization design
 */
export const CookieAuthVerifyDec = (tokenSecret: string) => {
  return (_target: any, _propertyKey: string, descriptor?: TypedPropertyDescriptor<any>) => {
    const originalMethod = descriptor.value;

    // convert to normal func

    descriptor.value = (req: DRequest, res: DResponse, next: DNextFunc) => {
      try {
        const context = this;

        if (!req.cookies)
          return next(new ErrorException(HttpStatus.UNAUTHORIZED, 'user not authorized, login and try again'));

        const { xAuthToken } = req.cookies;

        if (!xAuthToken)
          return next(new ErrorException(HttpStatus.UNAUTHORIZED, 'user not authorized, login and try again'));

        let payload: IPayload;

        //@ts-expect-error
        payload = verifyJWTwithHMAC({ token: xAuthToken, secret: tokenSecret });

        req.payload = payload;

        return originalMethod.apply(context, [req, res, next]);
      } catch (e) {
        throw e;
      }
    };
  };
};