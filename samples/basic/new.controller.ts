import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Get, Post, Route, Shield, UseMiddleware as UseMiddleware, ValidateReq } from '../../decorators';
import { testMiddleware } from './app.middleware';
import { testCase } from './app.validator';

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
  @UseMiddleware(testMiddleware)
  @ValidateReq(testCase)
  async testNewController(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { ...req.body, ...req.payload } });
  }
}
