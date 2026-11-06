import { DolphControllerHandler } from '.';
import { Dolph } from '../common';
/**
 * Dolph's route handler
 * - The `path` method represents the api endpoint to be used as path for all routes under this handler
 *
 * - The `initRoutes` method takes in routes to be used by this handler
 * ```js
 *   initRoutes() {
    this.router.post(`${this.path}`, this.controller.sendGreeting);
  }
 * ```
 *
 * @version 1.0.9
 */
abstract class DolphRouteHandler<T extends Dolph> {
    abstract path: T;
    abstract initRoutes(): void;
    // Required here so apps on the Fastify adapter never load Express.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    public router = (require('express') as typeof import('express')).Router();
    abstract controller: DolphControllerHandler<T>;
}

export { DolphRouteHandler };
