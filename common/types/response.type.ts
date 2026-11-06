import { DResponse } from '../interfaces';

export type ResponseInterceptor = (data: any, req: any, res: DResponse) => any;
