import { Response } from 'express';
import { HttpStatus } from './HttpStatus.api';
import { ResponseType } from '../types/response.type';

/**
 * returns a succes response with a default `200` status code
 * @param {ResponseType} param takes in the `res` ,`status` , `msg` and `body` values
 */
const SuccessResponse = (param: ResponseType): Response<any, Record<string, any>> => {
  const { res, status, body, msg } = param;
  if (body && msg) res.status(status || HttpStatus.OK).json({ ...body, message: msg });
  if (body) return res.status(status || HttpStatus.OK).json(body);
  if (msg) return res.status(status || HttpStatus.OK).send(msg);
  return res.status(status || HttpStatus.NO_CONTENT).send();
};

export { SuccessResponse };
