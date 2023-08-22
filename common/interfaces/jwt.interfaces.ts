import moment, { Moment } from 'moment';

export interface IPayload {
  sub: string | object | Buffer;
  iat: number;
  exp: number;
  info?: string | object | Array<any>;
}
