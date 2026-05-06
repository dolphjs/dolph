import httpStatus from 'http-status';
import { DNextFunc, DRequest, DResponse } from '../common';

/**
 * Terminal catch-all middleware — must be registered AFTER all routes.
 * Sends an empty 200 if the route handler returned without sending a response.
 * Note: does not apply to async handlers that are still in-flight when Express
 * processes this middleware; ensure async routes always send a response or call next().
 */
export const fallbackResponseMiddleware = (_req: DRequest, res: DResponse, next: DNextFunc) => {
    if (!res.headersSent) {
        res.status(httpStatus.OK).send();
    } else {
        next();
    }
};
