import { DNextFunc, DRequest, DResponse } from '../common';

export const fallbackResponseMiddleware = (req: DRequest, res: DResponse, next: DNextFunc) => {
  const originalSend = res.send;

  res.send = function (...args: any[]) {
    res.locals.responseSent = true;
    return originalSend.apply(res, args);
  };

  next();

  res.on('finish', () => {
    if (!res.locals.responseSent) {
      res.status(200).send();
    }
  });
};
