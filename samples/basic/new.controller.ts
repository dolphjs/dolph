import { DolphControllerHandler } from '../../classes';
import {
  DRequest,
  DResponse,
  Dolph,
  SuccessResponse,
  validateBodyMiddleware,
  validateParamMiddleware,
  validateQueryMiddleware,
} from '../../common';
import {
  Body,
  Get,
  Post,
  Render,
  Route,
  Shield,
  UnShield,
  UseMiddleware as UseMiddleware,
  ValidateReq,
} from '../../decorators';
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
    this.NewService.newA();
    SuccessResponse({ res, body: { message: 'ok' } });
  }

  @Post('test')
  // @UseMiddleware(testMiddleware)
  // @ValidateReq(testCase)
  @UnShield(testMiddleware)
  @UseMiddleware(validateBodyMiddleware(CreateUserDto))
  async testNewController(req: DRequest, res: DResponse) {
    const dto: CreateUserDto = req.body;
    SuccessResponse({ res, body: { dto, ...req.payload } });
  }

  @Get('home')
  @Render('home')
  getHomePage(req: DRequest, res: DResponse) {
    return { title: 'Home' };
  }

  @Get('about')
  @Render('about')
  getAboutPage(req: DRequest, res: DResponse) {
    return { title: 'About' };
  }
}
