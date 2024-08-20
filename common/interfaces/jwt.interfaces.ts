export interface IPayload {
  sub: string | object | Buffer;
  iat: number;
  exp: number;
  info?: any;
}

export interface AuthorizationFunction {
  (payload: IPayload): Promise<boolean> | boolean;
}
