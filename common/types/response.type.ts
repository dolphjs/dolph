import { Response } from 'express';
import { DResponse } from '../interfaces';

type ResponseType<T = any> = {
  res: DResponse | Response;
  status?: number;
  msg?: string;
  body?: T;
};

export { ResponseType };
