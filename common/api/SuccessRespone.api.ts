import { HttpStatus } from './HttpStatus.api';
import { ResponseType } from '../types/response.type';
import { DResponse } from '../interfaces';
import mime from 'mime-types';

const JSON_CONTENT_TYPE = mime.lookup('json') || 'application/json';

/**
 * returns a success response with a default `200` status code
 * @param {ResponseType} param takes in the `res` ,`status` , `msg` and `body` values
 */
const SuccessResponse = <T = any>(param: ResponseType<T>): DResponse<T> => {
    param.res.set('Content-Type', JSON_CONTENT_TYPE);

    const { res, status, body, msg } = param;
    if (body && msg) return res.status(status || HttpStatus.OK).json({ ...body, message: msg });
    if (body) return res.status(status || HttpStatus.OK).json(body);
    if (msg) return res.type('text/plain').status(status || HttpStatus.OK).send(msg);
    return res.status(status || HttpStatus.NO_CONTENT).send();
};

export { SuccessResponse };
