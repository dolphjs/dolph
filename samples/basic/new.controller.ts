import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Get, Post, Route, Shield, UseMiddlware } from '../../decorators';
import { testMiddleware } from './app.middleware';

@Shield(testMiddleware)
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
