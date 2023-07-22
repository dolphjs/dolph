import { Router } from '@dolphjs/core';
import { DolphControllerHandler } from './controller_classes.class';

/**
 * - The `path` method represents the api endpoint to be used as path for all routes unders this handler
 *
 * - The `initRoutes` method takes in routes to be used by this handler
 *
 */
abstract class DolphRouteHandler<T extends string> {
  abstract path: T;
  abstract initRoutes();
  protected router = Router();
  abstract controller: DolphControllerHandler<T>;
}

export { DolphRouteHandler };
