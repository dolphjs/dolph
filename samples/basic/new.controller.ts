import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Post, Route, UseMiddlware } from '../../decorators';
import { testMiddleware } from './app.middleware';

@Route('app')
export class NewController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @Post('test')
  @UseMiddlware(testMiddleware)
  async testNewController(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { ...req.body, ...req.payload } });
  }
}
