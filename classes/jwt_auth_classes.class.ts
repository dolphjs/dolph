import {
    AuthorizationFunction,
    DNextFunc,
    DRequest,
    DResponse,
    ErrorException,
    HttpStatus,
    IPayload,
    SocketMiddleware,
} from '../common';
import { AUTH_COOKIE_NAME, rejectInvalidToken, verifyJWTwithHMAC, verifyJWTwithRSA } from '../utilities';
import { config } from 'dotenv';
import { existsSync } from 'fs';
config();

export type JwtVerifyOptions = {
    /**
     * `HS256` (default) treats the first argument as a shared secret and reads the
     * `authorization` header. `RS256` treats it as a path to a public key and reads
     * the `x-auth-token` header.
     */
    algorithm?: 'HS256' | 'RS256';
};

export type JwtAuthOptions = JwtVerifyOptions & {
    /** Read the token from the auth cookie instead of a header. */
    cookie?: boolean;
    /** Runs after the token is verified. Return false to answer 403. */
    authorize?: AuthorizationFunction;
};

/**
 * The algorithm is fixed by the server and never inferred from the request.
 * Letting the header choose meant a key path could be used as an HMAC secret to
 * forge tokens, and a secret could be read as a file path and leak in the error.
 */
const tokenHeader = ({ algorithm = 'HS256' }: JwtVerifyOptions = {}) =>
    algorithm === 'RS256' ? 'x-auth-token' : 'authorization';

const verifyToken = (
    authToken: string | string[] | undefined,
    tokenSecret: string,
    { algorithm = 'HS256' }: JwtVerifyOptions = {},
) => {
    const isRsa = algorithm === 'RS256';

    if (!authToken?.length) {
        throw new ErrorException('provide a valid token header', HttpStatus.UNAUTHORIZED);
    }

    return rejectInvalidToken(() =>
        isRsa
            ? verifyJWTwithRSA({ pathToPublicKey: tokenSecret, token: authToken })
            : verifyJWTwithHMAC({ token: authToken, secret: tokenSecret }),
    ) as IPayload;
};

const verifyRequestToken = (req: DRequest, tokenSecret: string, options?: JwtVerifyOptions) =>
    verifyToken(req.headers[tokenHeader(options)], tokenSecret, options);

/**
 * Stops an RSA setup that forgot `{ algorithm: 'RS256' }` from running as HMAC with its
 * key path as the secret. Real tokens would fail, but anyone who knows the path could
 * forge one, so this has to stop the app at boot. The value stays out of the message
 * because it could be a real secret.
 */
const assertKeyMatchesAlgorithm = (tokenSecret: string, { algorithm = 'HS256' }: JwtVerifyOptions = {}) => {
    if (algorithm === 'HS256' && existsSync(tokenSecret)) {
        throw new Error(
            "JWT secret is a path to a file. For RSA, pass { algorithm: 'RS256' }. For HMAC, use a secret that isn't a file path.",
        );
    }
};

/**
 * Middleware that verifies a JWT and puts its payload on `req.payload`. Use it with
 * `@Shield`, `@UseMiddleware` or the `middlewares` option:
 *
 * - `jwtAuth(secret)` reads the `authorization` header.
 * - `jwtAuth(publicKeyPath, { algorithm: 'RS256' })` reads the `x-auth-token` header.
 * - `jwtAuth(secret, { cookie: true })` reads the cookie set by `newAuthCookie`.
 * - `jwtAuth(secret, { authorize })` also answers 403 when `authorize(payload)` is false.
 *
 * Keep the result in a variable to pass the same reference to `@UnShield`.
 */
const jwtAuth = (tokenSecret: string, options: JwtAuthOptions = {}) => {
    assertKeyMatchesAlgorithm(tokenSecret, options);

    const { authorize, cookie } = options;

    return async (req: DRequest, _res: DResponse, next: DNextFunc) => {
        try {
            const token = cookie ? req.cookies?.[AUTH_COOKIE_NAME] : req.headers[tokenHeader(options)];

            req.payload = verifyToken(token, tokenSecret, options);

            if (authorize && !(await authorize(req.payload))) {
                return next(new ErrorException('Access denied', HttpStatus.FORBIDDEN));
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
};

/**
 * Socket.IO middleware that verifies a JWT when a client connects, using the same
 * rules as HTTP. Clients send the token as `io(url, { auth: { token } })`, or in the
 * header that matches the algorithm. The payload is available as `socket.data.payload`.
 *
 * Pass it as `auth` in the DolphFactory socket config so it covers every namespace.
 *
 * @version 1.0.0
 */
const socketJwtAuth = (tokenSecret: string, options?: JwtVerifyOptions): SocketMiddleware => {
    assertKeyMatchesAlgorithm(tokenSecret, options);

    return (socket, next) => {
        const { auth, headers } = socket.handshake;

        try {
            socket.data.payload = verifyToken(auth?.token ?? headers[tokenHeader(options)], tokenSecret, options);
        } catch {
            // One message for every failure, so a client learns nothing about why.
            return next(new Error('unauthorized'));
        }

        next();
    };
};

export { jwtAuth, socketJwtAuth };
