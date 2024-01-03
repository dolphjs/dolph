export type sub = string | object | Buffer;

export type cookieContent = {
  name: string;
  value: string;
  maxAge: Date;
  httpOnly: boolean;
  secure: boolean;
};
