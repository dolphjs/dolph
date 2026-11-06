import type { Namespace, Server, Socket } from 'socket.io';
import { SocketMiddleware } from '../../common/interfaces/socket.interfaces';
import { logger } from '../../utilities';

type Listener = (...args: unknown[]) => unknown;
type GuardedListener = Listener & { listener: Listener };

/**
 * Wraps an event listener so its failures stay contained. Socket handlers run outside
 * any request, so an error here would otherwise reach the process-wide handlers and
 * take the server down for everyone, and any client could trigger that with a bad payload.
 */
const guardListener = (event: string, listener: Listener): GuardedListener => {
    const report = (args: unknown[], error: Error) => {
        logger.error(`Socket handler for '${event}' failed: ${error?.message ?? error}`);

        const ack = args[args.length - 1];
        if (typeof ack === 'function') ack({ error: 'Internal Server Error' });
    };

    const guarded = function (this: unknown, ...args: unknown[]) {
        try {
            const result = listener.apply(this, args);

            if (typeof (result as PromiseLike<unknown>)?.then === 'function') {
                Promise.resolve(result).catch((error) => report(args, error));
            }

            return result;
        } catch (error) {
            report(args, error);
        }
    } as GuardedListener;

    // Node matches this property in removeListener, so off() still works with the original function.
    guarded.listener = listener;

    return guarded;
};

type EventTarget = Pick<Socket, 'on' | 'once'>;

const guardListeners = (target: EventTarget) => {
    (['on', 'once'] as const).forEach((method) => {
        const original = target[method].bind(target) as (event: string, listener: Listener) => unknown;

        (target as unknown as Record<string, unknown>)[method] = (event: string, listener: Listener) =>
            original(event, guardListener(event, listener));
    });
};

const guardSocket = (socket: Socket) => {
    guardListeners(socket);

    (['onAny', 'prependAny'] as const).forEach((method) => {
        const original = socket[method].bind(socket) as (listener: Listener) => unknown;

        (socket as unknown as Record<string, unknown>)[method] = (listener: Listener) =>
            original(guardListener('*', listener));
    });
};

/**
 * Refuses the connection if a middleware throws or rejects, so a failing auth check
 * can neither let a client in nor crash the server.
 */
const guardMiddleware = (middleware: SocketMiddleware): SocketMiddleware => (socket, next) => {
    const refuse = (error: Error) => {
        logger.error(`Socket middleware failed: ${error?.message ?? error}`);
        next(new Error('unauthorized'));
    };

    try {
        const result = middleware(socket, next);

        if (typeof (result as PromiseLike<unknown>)?.then === 'function') {
            Promise.resolve(result).catch(refuse);
        }
    } catch (error) {
        refuse(error);
    }
};

/**
 * Runs `protect` once for every namespace on the server, however it gets created.
 * `new_namespace` alone misses `io.of(/regex/)` and `io.of(fn)`, which never emit it.
 */
export const forEachNamespace = (io: Server, protect: (namespace: Namespace) => void) => {
    const seen = new WeakSet<Namespace>();

    const visit = (namespace: Namespace) => {
        if (seen.has(namespace)) return;
        seen.add(namespace);
        protect(namespace);
    };

    const originalOf = io.of.bind(io);

    io.of = ((...args: Parameters<Server['of']>) => {
        const namespace = originalOf(...args);
        visit(namespace);
        return namespace;
    }) as Server['of'];

    io.sockets.on('new_namespace', visit);
    visit(io.sockets);
};

/**
 * Stops anything thrown or rejected by a socket handler from reaching the process,
 * including handlers on `connection` itself.
 */
export const guardSocketHandlers = (io: Server) => {
    forEachNamespace(io, (namespace) => {
        // Added first so sockets are wrapped before any user handler sees them.
        namespace.on('connection', guardSocket);
        guardListeners(namespace as unknown as EventTarget);

        const originalUse = namespace.use.bind(namespace);
        namespace.use = (middleware) => originalUse(guardMiddleware(middleware as SocketMiddleware));
    });
};
