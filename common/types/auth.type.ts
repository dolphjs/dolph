export type sub = string | object | Buffer;

export type cookieContent = {
    name: string;
    value: string;
    expires: Date;
    httpOnly: boolean;
    secure: boolean;
};
