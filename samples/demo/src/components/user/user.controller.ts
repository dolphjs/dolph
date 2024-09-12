import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, SuccessResponse, DRequest, DResponse, TryCatchAsyncDec } from '../../../../../common';
import { Get, Post, Route } from '../../../../../decorators';

@Route('user')
export class UserController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @Get('greet')
  async greet(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { message: "you've reached the user endpoint." } });
  }

  @Post('')
  @TryCatchAsyncDec
  async post(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: req.body });
  }
}
