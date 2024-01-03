import { configs } from '../../core/config.core';
import { DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload, cookieContent, sub } from '../../common';
import { generateJWTwithHMAC, verifyJWTwithHMAC } from './JWT_generator.utilities';
import moment from 'moment';

/**
 *
 * @param sub holds value for the principal data used in hashing the token
 * @param exp expiration time in milliseconds, i.e 1000 for 1 seconds
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
    expires: new Date(new Date().getTime() + exp * 60 * 30),
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
    expires: options.expires,
    httpOnly: options.httpOnly,
    secure: options.secure,
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

  let payload: IPayload;

  //@ts-expect-error
  payload = verifyJWTwithHMAC({ token: xAuthToken, secret: tokenSecret });

  req.payload = payload;
  req.payload.info = xAuthToken.info ? xAuthToken.info : null;

  next();
};
