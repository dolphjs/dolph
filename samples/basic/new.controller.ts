import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Get, Post, Route, UseMiddlware } from '../../decorators';
import { testMiddleware } from './app.middleware';

@Route('app')
export class NewController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @Get('test')
  async newReq(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: {} });
  }

  @Post('test')
  @UseMiddlware(testMiddleware)
  async testNewController(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { ...req.body, ...req.payload } });
  }
}
