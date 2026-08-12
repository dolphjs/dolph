import { RequestHandler } from 'express';
import { inAppLogger } from '../utils/logger.utils';
import clc from 'cli-color';

class MiddlewareRegistry {
    private static instance: MiddlewareRegistry;
    private middlewares: RequestHandler[] = [];
    private sealed = false;

    private constructor() {
        // singleton
    }

    public static getInstance(): MiddlewareRegistry {
        if (!MiddlewareRegistry.instance) {
            MiddlewareRegistry.instance = new MiddlewareRegistry();
        }

        return MiddlewareRegistry.instance;
    }

    public register(middleware: RequestHandler) {
        if (this.sealed) {
            inAppLogger.warn(
                clc.yellow(
                    '[dolphjs] middlewareRegistry.register() called after DolphFactory was initialised — ' +
                        'this middleware will NOT be applied. Register all middleware before constructing DolphFactory.'
                )
            );
            return;
        }
        this.middlewares.push(middleware);
    }

    public registerMany(middlewares: RequestHandler[]) {
        middlewares.forEach((middleware) => this.register(middleware));
    }

    public getMiddlewares(): RequestHandler[] {
        return this.middlewares;
    }

    /** Called internally by DolphFactory once the engine is set up. */
    public seal() {
        this.sealed = true;
    }
}

export const middlewareRegistry = MiddlewareRegistry.getInstance();
