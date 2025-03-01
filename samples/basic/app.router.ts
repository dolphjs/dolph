import { DolphRouteHandler } from '../../classes';
import { AppController } from './app.controller';
import { reqValidatorMiddleware } from '../../common/middlewares';
import { createUser } from './app.validator';
import { Dolph } from '../../common';
import { cookieAuthVerify } from '../../utilities';

class AppRouter extends DolphRouteHandler<Dolph> {
    constructor() {
        super();
        this.initRoutes();
    }

    public readonly path: string = '/app';
    controller: AppController = new AppController();

    initRoutes() {
        this.router.post(`${this.path}`, this.controller.sendGreeting);
        this.router.post(`${this.path}/user`, reqValidatorMiddleware(createUser), this.controller.createUser);
        this.router.post(`${this.path}/register`, this.controller.register);
        this.router.post(`${this.path}/sql`, this.controller.testMysql);
        this.router.get(`${this.path}/cookie`, this.controller.testCookieFn);
        // this.router.get(`${this.path}/cookie-validation`, cookieAuthVerify('random_secret'), this.controller.testCookieVerify);
        this.router.get(`${this.path}/cookie-validation`, this.controller.testCookieVerify);
    }
}

export { AppRouter };
