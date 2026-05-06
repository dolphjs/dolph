import { DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload } from '../../common';
import { verifyJWTwithHMAC } from '../../utilities';

/**
 *
 * class-method decorator used for authorization based on the dolphjs default cookie authentication and authorization pattern
 *
 * @version 1.0
 */
export const CookieAuthVerifyDec = (tokenSecret: string) => {
    return (_target: any, _propertyKey: string, descriptor?: TypedPropertyDescriptor<any>) => {
        const originalMethod = descriptor.value;

        // convert to normal func

        descriptor.value = function (req: DRequest, res: DResponse, next: DNextFunc) {
            try {
                if (!req.cookies)
                    return next(new ErrorException('user not authorized, login and try again', HttpStatus.UNAUTHORIZED));

                const { xAuthToken } = req.cookies;

                if (!xAuthToken)
                    return next(new ErrorException('user not authorized, login and try again', HttpStatus.UNAUTHORIZED));

                // @ts-expect-error legacy typing compatibility
                const payload: IPayload = verifyJWTwithHMAC({ token: xAuthToken, secret: tokenSecret });

                req.payload = payload;

                return originalMethod.apply(this, [req, res, next]);
            } catch (e) {
                throw e;
            }
        };
    };
};
