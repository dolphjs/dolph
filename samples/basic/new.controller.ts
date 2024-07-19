import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse, validateBodyMiddleware } from '../../common';
import { Body, Get, Post, Route, Shield, UseDto, UseMiddleware as UseMiddleware, ValidateReq } from '../../decorators';
import { testMiddleware } from './app.middleware';
import { testCase } from './app.validator';
import { CreateUserDto } from './new.dto';
import { NewService } from './new.service';

@Shield(testMiddleware)
@Route('app')
export class NewController extends DolphControllerHandler<Dolph> {
  private NewService: NewService;

  constructor() {
    super();
  }

  @Get('test')
  async newReq(req: DRequest, res: DResponse) {
    this.NewService.logger();
    SuccessResponse({ res, body: { message: 'ok' } });
  }

  @Post('test')
  @UseMiddleware(testMiddleware)
  // @ValidateReq(testCase)
  @UseMiddleware(validateBodyMiddleware(CreateUserDto))
  async testNewController(req: DRequest, res: DResponse) {
    const dto: CreateUserDto = req.body;
    SuccessResponse({ res, body: { dto, ...req.payload } });
  }
}
