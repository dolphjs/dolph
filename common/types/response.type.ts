import { Response } from 'express';

type ResponseType = {
  res: Response;
  status?: number;
  msg?: string;
  body?: Object;
};

export { ResponseType };
