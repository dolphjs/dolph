import { DolphRouteHandler } from '../../classes';
import { AppController } from './app.controller';
import { Dolph } from '../../common';
import { jwtAuth } from '../../classes';
import { useFileUploader } from '../../packages';

class AppRouter extends DolphRouteHandler<Dolph> {
    constructor() {
        super();
        this.initRoutes();
    }

    public readonly path: string = '/app';
    controller: AppController = new AppController();

    initRoutes() {
        this.router.post(`${this.path}`, this.controller.sendGreeting);
        this.router.post(
            `${this.path}/user`,
            jwtAuth('random_secret'),
            useFileUploader({ fieldname: 'upload', type: 'single', extensions: ['.png'] }),
            this.controller.createUser,
        );
        this.router.post(`${this.path}/register`, this.controller.register);
        this.router.get(`${this.path}/cookie`, this.controller.testCookieFn);
        this.router.get(
            `${this.path}/cookie-validation`,
            jwtAuth('random_secret', { cookie: true }),
            this.controller.testCookieVerify,
        );
    }
}

export { AppRouter };
