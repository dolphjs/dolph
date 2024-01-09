export interface IPayload {
  sub: string | object | Buffer;
  iat: number;
  exp: number;
  info?: string | object | Array<any>;
}

export interface AuthorizationFunction {
  (payload: IPayload): Promise<boolean> | boolean;
}
