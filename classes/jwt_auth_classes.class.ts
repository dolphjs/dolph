import { AuthorizationFunction, DNextFunc, DRequest, DResponse, ErrorException, HttpStatus, IPayload } from '../common';
import { rejectInvalidToken, verifyJWTwithHMAC, verifyJWTwithRSA } from '../utilities';
import { config } from 'dotenv';
config();

export type JwtVerifyOptions = {
    /**
     * `HS256` (default) treats the first argument as a shared secret and reads the
     * `authorization` header. `RS256` treats it as a path to a public key and reads
     * the `x-auth-token` header.
     */
    algorithm?: 'HS256' | 'RS256';
};

/**
 * The algorithm is fixed by the server and never inferred from the request.
 * Letting the header choose meant a key path could be used as an HMAC secret to
 * forge tokens, and a secret could be read as a file path and leak in the error.
 */
const verifyRequestToken = (req: DRequest, tokenSecret: string, { algorithm = 'HS256' }: JwtVerifyOptions = {}) => {
    const isRsa = algorithm === 'RS256';
    const authToken = req.headers[isRsa ? 'x-auth-token' : 'authorization'];

    if (!authToken?.length) {
        throw new ErrorException('provide a valid token header', HttpStatus.UNAUTHORIZED);
    }

    return rejectInvalidToken(() =>
        isRsa
            ? verifyJWTwithRSA({ pathToPublicKey: tokenSecret, token: authToken })
            : verifyJWTwithHMAC({ token: authToken, secret: tokenSecret }),
    ) as IPayload;
};

/**
 * Takes the token secret, or the path to a public key with `{ algorithm: 'RS256' }`.
 *
 * The Verify method resolves with the token payload and rejects if it is missing or invalid.
 */
class JwtBasicAuth {
    constructor(
        public tokenSecret: string,
        public options: JwtVerifyOptions = {},
    ) {}

    Verify = async (req: DRequest): Promise<IPayload> => verifyRequestToken(req, this.tokenSecret, this.options);
}

/**
 *
 * class-method decorator used for authorization based on the dolphjs default JWT authentication and authorization design
 *
 * @version 2.0.0
 */
const JWTAuthVerifyDec = (tokenSecret: string, options?: JwtVerifyOptions) => {
    return (_target: any, _propertyKey: string, descriptor?: TypedPropertyDescriptor<any>) => {
        const originalMethod = descriptor.value;

        // convert to normal func
        descriptor.value = function (req: DRequest, res: DResponse, next: DNextFunc) {
            try {
                req.payload = verifyRequestToken(req, tokenSecret, options);
            } catch (error) {
                return next(error);
            }

            return originalMethod.apply(this, [req, res, next]);
        };
    };
};

const JWTAuthorizeDec = (tokenSecret: string, authorize?: AuthorizationFunction, options?: JwtVerifyOptions) => {
    return (_target: any, _propertyKey: string, descriptor?: TypedPropertyDescriptor<any>) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (req: DRequest, res: DResponse, next: DNextFunc) {
            try {
                const payload = verifyRequestToken(req, tokenSecret, options);
                req.payload = payload;

                if (authorize && !(await authorize(payload))) {
                    return next(new ErrorException('Access denied', HttpStatus.FORBIDDEN));
                }
            } catch (error) {
                return next(error);
            }

            return originalMethod.apply(this, [req, res, next]);
        };
    };
};

export { JwtBasicAuth, JWTAuthVerifyDec, JWTAuthorizeDec };
