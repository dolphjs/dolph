import { DolphRouteHandler } from '../../common/classes';
import { AppController } from './app.controller';

class AppRouter extends DolphRouteHandler<string> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  controller: AppController = new AppController();

  initRoutes() {
    this.router.post(`${this.path}`, this.controller.sendGreeting);
    this.router.post(`${this.path}/user`, this.controller.createUser);
  }
}

export { AppRouter };
