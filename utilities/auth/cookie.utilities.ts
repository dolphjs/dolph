import { configs } from '../../core/config.core';
import { DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload, cookieContent, sub } from '../../common';
import { generateJWTwithHMAC, rejectInvalidToken, verifyJWTwithHMAC } from './JWT_generator.utilities';

/**
 *
 * @param sub holds value for the principal data used in hashing the token
 * @param exp expiration time in Date
 * @param secret token secret used for authorization
 * @param info option parameter used to store data that might be useful
 *
 * @version 2
 */
export const newAuthCookie = (sub: sub, exp: Date, secret: string, info?: string | object | []): cookieContent => {
    const payload: IPayload = {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(exp.getTime() / 1000),
        sub: sub,
        info: info,
    };
    const token = generateJWTwithHMAC({ payload, secret });

    return {
        name: 'xAuthToken',
        value: token,
        expires: new Date(exp.getTime()),
        httpOnly: true,
        // Only relaxed in development, where the app is usually on plain http.
        secure: configs.NODE_ENV !== 'development',
        sameSite: 'lax',
    };
};

/**
 * function used for authorization based on the dolphjs default cookie authentication and authorization pattern
 *
 * @version 1.1
 */
export const cookieAuthVerify = (tokenSecret: string) => (req: DRequest, _res: DResponse, next: DNextFunc) => {
    const cookies = req.cookies;

    if (!cookies) return next(new ErrorException('user not authorized, login and try again', HttpStatus.UNAUTHORIZED));

    const { xAuthToken } = cookies;

    if (!xAuthToken) return next(new ErrorException('user not authorized, login and try again', HttpStatus.UNAUTHORIZED));

    try {
        req.payload = rejectInvalidToken(() =>
            verifyJWTwithHMAC({ token: xAuthToken, secret: tokenSecret }),
        ) as IPayload;
    } catch (error) {
        return next(error);
    }

    next();
};
