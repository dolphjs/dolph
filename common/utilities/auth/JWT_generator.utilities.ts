import JWT from 'jsonwebtoken';
import { IPayload } from '../../interfaces';
import { readFileSync } from 'fs';

const generateJWTwithHMAC = ({ payload, secret }: { payload: IPayload; secret: string }): string => {
  const token = JWT.sign(payload, secret);
  return token;
};

const verifyJWTwithHMAC = ({ token, secret }: { token: string | string[]; secret: string }): string | JWT.JwtPayload => {
  //@ts-expect-error
  const payload = JWT.verify(token, secret);
  return payload;
};

const generateJWTwithRSA = ({ pathToPrivateKey, payload }: { pathToPrivateKey: string; payload: IPayload }): string => {
  const privateKey = readFileSync(pathToPrivateKey, 'utf8');
  const token = JWT.sign(payload, privateKey, { algorithm: 'RS256' });
  return token;
};

const verifyJWTwithRSA = ({
  pathToPublicKey,
  token,
}: {
  pathToPublicKey: string;
  token: string | string[];
}): string | JWT.JwtPayload => {
  const publicKey = readFileSync(pathToPublicKey, 'utf8');
  try {
    //@ts-expect-error
    const payload = JWT.verify(token, publicKey, { algorithms: ['RS256'] });
    return payload;
  } catch (e) {
    throw e;
  }
};

export { generateJWTwithHMAC, verifyJWTwithHMAC, verifyJWTwithRSA, generateJWTwithRSA };
