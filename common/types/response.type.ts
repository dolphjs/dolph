import { DResponse } from '../interfaces';

type ResponseType<T = any> = {
    res: DResponse;
    status?: number;
    msg?: string;
    body?: T;
};

export type ResponseInterceptor = (data: any, req: any, res: DResponse) => any;

export { ResponseType };
