import type { IncomingMessage } from 'http';
import type { ServerOptions } from 'socket.io';

type AllowRequest = NonNullable<ServerOptions['allowRequest']>;
type OriginRule = unknown;

const isSameOrigin = (origin: string, req: IncomingMessage) => {
    try {
        return new URL(origin).host === req.headers.host;
    } catch {
        return false;
    }
};

const isAllowed = async (rule: OriginRule, origin: string): Promise<boolean> => {
    if (rule === true || rule === '*') return true;
    if (typeof rule === 'string') return rule === origin;
    if (rule instanceof RegExp) return rule.test(origin);
    if (Array.isArray(rule)) return (await Promise.all(rule.map((item) => isAllowed(item, origin)))).some(Boolean);

    if (typeof rule === 'function') {
        const resolved = await new Promise<OriginRule>((resolve, reject) => {
            rule(origin, (error: Error | null, result: OriginRule) => (error ? reject(error) : resolve(result)));
        });

        return isAllowed(resolved, origin);
    }

    return false;
};

/**
 * Browsers don't apply CORS to WebSockets, so without this any site could open a
 * socket to the server, with the visitor's cookies attached. `cors.origin` is enforced
 * on the connection itself, and with none set only the same origin may connect.
 * Non-browser clients send no Origin and aren't affected. A custom `allowRequest` wins.
 */
export const originAllowRequest = (options: Partial<ServerOptions> = {}): AllowRequest => {
    if (options.allowRequest) return options.allowRequest;

    const cors = options.cors;
    const rule = typeof cors === 'object' ? cors?.origin : undefined;

    return (req, callback) => {
        const origin = req.headers.origin;

        if (!origin) return callback(null, true);

        const check = rule === undefined || rule === false ? Promise.resolve(isSameOrigin(origin, req)) : isAllowed(rule, origin);

        // A failing origin function refuses the connection rather than leaving it open.
        check.then(
            (allowed) => callback(allowed ? null : 'Origin not allowed', allowed),
            () => callback('Origin not allowed', false),
        );
    };
};
