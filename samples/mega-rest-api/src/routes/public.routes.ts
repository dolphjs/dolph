import { DolphRouteHandler } from '../../../../classes';
import { Dolph } from '../../../../common';
import { PublicController } from './public.controller';

export class PublicRoutes extends DolphRouteHandler<Dolph> {
    public readonly path: Dolph = '/public';
    controller: PublicController = new PublicController();

    constructor() {
        super();
        this.initRoutes();
    }

    initRoutes() {
        this.router.get('/docs', this.controller.docs);
        this.router.post('/echo', this.controller.echo);
    }
}
