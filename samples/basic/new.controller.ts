import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Post, Route } from '../../decorators';

@Route('new')
export class NewController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @Post()
  async testNewController(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { ...req.body } });
  }
}
