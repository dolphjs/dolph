import { InternalServerErrorException } from '@dolphjs/dolph/common';
import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, SuccessResponse, DRequest, DResponse } from '../../../../../common';
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
  async post(req: DRequest, res: DResponse) {
    throw new InternalServerErrorException('Here is an error, big time one');
    SuccessResponse({ res, body: req.body });
  }
}
