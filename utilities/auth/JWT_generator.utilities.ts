import JWT from 'jsonwebtoken';
import { IPayload } from '../../common';
import { readFileSync } from 'fs';
import { ErrorException, HttpStatus } from '../../common';

/**
 *
 *  Generates JWT auth token using the HMAC algorithm
 *
 * @version 1.0.0
 */
const generateJWTwithHMAC = ({ payload, secret }: { payload: IPayload; secret: string }): string => {
    const token = JWT.sign(payload, secret);
    return token;
};

/**
 *
 *  Verify's JWT auth token created using the HMAC algorithm
 *
 * @version 1.0.0
 */
const verifyJWTwithHMAC = ({ token, secret }: { token: string | string[]; secret: string }): string | JWT.JwtPayload => {
    // @ts-expect-error legacy typing compatibility
    const payload = JWT.verify(token, secret, { algorithms: ['HS256'] });
    return payload;
};

/**
 *
 * Generates JWT token using the RSA algorithm and a privatekey
 *
 * @version 1.0.0
 */
const generateJWTwithRSA = ({ pathToPrivateKey, payload }: { pathToPrivateKey: string; payload: IPayload }): string => {
    const privateKey = readFileSync(pathToPrivateKey, 'utf8');
    const token = JWT.sign(payload, privateKey, { algorithm: 'RS256' });
    return token;
};

/**
 *
 * Verify's JWT token created using the `generateJWTwithRSA` function and publicKey
 *
 * @version 1.0.0
 */
const verifyJWTwithRSA = ({
    pathToPublicKey,
    token,
}: {
    pathToPublicKey: string;
    token: string | string[];
}): string | JWT.JwtPayload => {
    const publicKey = readFileSync(pathToPublicKey, 'utf8');
    try {
        // @ts-expect-error legacy typing compatibility
        const payload = JWT.verify(token, publicKey, { algorithms: ['RS256'] });
        return payload;
    } catch (e) {
        throw e;
    }
};

/**
 * Runs a token check and turns a bad token into a 401, instead of the 500 an
 * unrecognised error would become. Anything else, like an unreadable key file,
 * is a server fault and is rethrown as it is.
 *
 * @version 1.0.0
 */
const rejectInvalidToken = <T>(verify: () => T): T => {
    try {
        return verify();
    } catch (error) {
        if (error instanceof JWT.JsonWebTokenError) {
            throw new ErrorException('invalid or expired token', HttpStatus.UNAUTHORIZED);
        }
        throw error;
    }
};

export { generateJWTwithHMAC, verifyJWTwithHMAC, verifyJWTwithRSA, generateJWTwithRSA, rejectInvalidToken };
