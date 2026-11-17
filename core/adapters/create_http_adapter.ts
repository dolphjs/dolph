import { AdapterName, HttpAdapter } from './http_adapter';

const ADAPTERS: AdapterName[] = ['express', 'fastify', 'dolph'];

/**
 * `DOLPH_ADAPTER` wins over `adapter` in dolph_config.yaml so the same app can run
 * on either server without a config change, which is how CI tests both.
 */
export const createHttpAdapter = (configured?: string): HttpAdapter => {
    const name = process.env.DOLPH_ADAPTER || configured || 'express';

    if (!ADAPTERS.includes(name as AdapterName)) {
        throw new Error(`Unknown adapter '${name}' in dolph_config.yaml. Use 'express', 'fastify' or 'dolph'.`);
    }

    // Required here so an app only loads the server it uses.
    if (name === 'dolph') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { DolphAdapter } = require('./dolph_adapter') as typeof import('./dolph_adapter');

        return new DolphAdapter();
    }

    if (name === 'fastify') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { FastifyAdapter } = require('./fastify_adapter') as typeof import('./fastify_adapter');

        return new FastifyAdapter();
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExpressAdapter } = require('./express_adapter') as typeof import('./express_adapter');

    return new ExpressAdapter();
};
