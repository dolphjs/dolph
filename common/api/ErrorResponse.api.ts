import { HttpStatus } from './HttpStatus.api';
import { ResponseType } from '../types/response.type';
import { DResponse } from '../interfaces';
import mime from 'mime-types';

/**
 * returns an error as response with the provided  parameters and a default `400` status code
 * @param {ResponseType} param takes in the `res` ,`status` , `msg` and `body` values
 */
const ErrorResponse = <T = any>(param: ResponseType<T>): DResponse<T> => {
    const contentType = mime.lookup('json') || 'application/json';

    param.res.set('Content-Type', contentType);

    const { res, status, body, msg } = param;
    if (body && msg) res.status(status || HttpStatus.BAD_REQUEST).json({ ...body, message: msg });
    if (body) return res.status(status || HttpStatus.BAD_REQUEST).json(body);
    if (msg) return res.status(status || HttpStatus.BAD_REQUEST).send(msg);
    return res.status(status || HttpStatus.INTERNAL_SERVER_ERROR).send();
};

export { ErrorResponse };
