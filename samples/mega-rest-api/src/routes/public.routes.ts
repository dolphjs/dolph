import { DolphRouteHandler } from '../../../../classes';
import { reqValidatorMiddleware } from '../../../../common/middlewares';
import Joi from 'joi';
import { Dolph } from '../../../../common';
import { PublicController } from './public.controller';

const echoValidator = {
    body: Joi.object({
        message: Joi.string().required(),
    }),
};

export class PublicRoutes extends DolphRouteHandler<Dolph> {
    public readonly path: Dolph = '/public';
    controller: PublicController = new PublicController();

    constructor() {
        super();
        this.initRoutes();
    }

    initRoutes() {
        this.router.get('/docs', this.controller.docs);
        this.router.post('/echo', reqValidatorMiddleware(echoValidator), this.controller.echo);
    }
}
