import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, DRequest, DResponse } from '../../../../../common';
import { Get, Route } from '../../../../../decorators';

@Route('user2')
export class User2Controller extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('')
    get(req: DRequest, res: DResponse) {
        return req.query;
    }
}
