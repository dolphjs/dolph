import { configs } from '../../core/config.core';
import { IPayload, cookieContent, sub } from '../../common';
import { generateJWTwithHMAC } from './JWT_generator.utilities';
import moment from 'moment';

/**
 *
 * @param sub holds value for the principal data used in hashing the token
 * @param exp expiration time in numbers, i.e 1000 for 1000 milliseconds
 * @param secret token seccret used for authorization
 * @param info option parameter used to store data that might be useful
 *
 * @version 1.1
 */
export const newAuthCookie = (sub: sub, exp: number, secret: string, info?: string | object | []): cookieContent => {
  const payload: IPayload = {
    exp: moment().add(exp, 'seconds').unix(),
    iat: moment().unix(),
    sub: sub,
    info: info,
  };
  const token = generateJWTwithHMAC({ payload, secret });

  const options = {
    expires: new Date(new Date().getTime() + exp * 60),
    httpOnly: false,
    secure: false,
  };

  if (configs.NODE_ENV !== 'development') {
    options.httpOnly = true;
    options.secure = true;
  }

  return {
    name: 'xAuthToken',
    value: token,
    maxAge: options.expires,
    httpOnly: options.httpOnly,
    secure: options.secure,
  };
};
