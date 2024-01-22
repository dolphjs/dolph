import { DNextFunc, DRequest, DResponse } from '../../common';

export const testMiddleware = (req: DRequest, res: DResponse, next: DNextFunc) => {
  console.log(req.body);
  req.payload = {
    sub: '',
    exp: 0,
    iat: 0,
  };
  next();
};
