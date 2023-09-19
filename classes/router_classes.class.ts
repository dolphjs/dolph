import { Router } from '@dolphjs/core';
import { DolphControllerHandler } from '.';
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
 * @version 1.0.0
 */
abstract class DolphRouteHandler<T extends string> {
  abstract path: T;
  abstract initRoutes(): void;
  public router = Router();
  abstract controller: DolphControllerHandler<T>;
}

export { DolphRouteHandler };
