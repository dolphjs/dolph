import httpStatus from 'http-status';
import { DNextFunc, DRequest, DResponse } from '../common';

export const fallbackResponseMiddleware = (_req: DRequest, res: DResponse, next: DNextFunc) => {
    res.on('finish', () => {
        if (!res.headersSent) {
            res.status(httpStatus.OK).send();
        }
    });
    next();
};
