import { configs } from '../../core/config.core';
import { IPayload, cookieContent, sub } from '../../common';
import { generateJWTwithHMAC } from './JWT_generator.utilities';

export const AUTH_COOKIE_NAME = 'xAuthToken';

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
        name: AUTH_COOKIE_NAME,
        value: token,
        expires: new Date(exp.getTime()),
        httpOnly: true,
        // Only relaxed in development, where the app is usually on plain http.
        secure: configs.NODE_ENV !== 'development',
        sameSite: 'lax',
    };
};
