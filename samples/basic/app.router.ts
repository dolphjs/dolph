import { DolphRouteHandler } from '../../common/classes';
import { AppController } from './app.controller';
import { reqValidatorMiddleware } from '../../common/middlewares';
import { createUser } from './app.validator';

class AppRouter extends DolphRouteHandler<string> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  controller: AppController = new AppController();

  initRoutes() {
    this.router.post(`${this.path}`, this.controller.sendGreeting);
    this.router.post(`${this.path}/user`, reqValidatorMiddleware(createUser), this.controller.createUser);
  }
}

export { AppRouter };
