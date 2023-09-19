import { NextFunction, Request, Response } from 'express';
import { DolphControllerHandler, DolphServiceHandler, JWTAuthVerifyDec } from '../../classes';
import { TryCatchAsyncDec, TryCatchAsyncFn, TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { BadRequestException, SuccessResponse } from '../../common';
import { generateJWTwithHMAC } from '../../utilities';
import moment from 'moment';
import { MediaParser } from '../../utilities';
import { InjectServiceHandler } from '../../decorators';

@InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appservice' }])
class ControllerService {
  appservice!: AppService;
}

const controllerServices = new ControllerService();
class AppController extends DolphControllerHandler<string> {
  constructor() {
    super();
    this.createUser = this.createUser.bind(this);
  }

  public readonly sendGreeting = TryCatchFn((req: Request, res: Response) => {
    const { body } = req;
    const response = controllerServices.appservice.greeting(body);
    SuccessResponse({ res, msg: response });
  });

  @TryCatchAsyncDec
  @JWTAuthVerifyDec('random_secret')
  @MediaParser({ fieldname: 'upload', type: 'single', extensions: ['.png'] })
  public async createUser(req: Request, res: Response) {
    const { body, file } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
    const data = await controllerServices.appservice.createUser(body);
    SuccessResponse({ res, body: { data, file: file } });
  }

  public readonly register = TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;
    const token = generateJWTwithHMAC({
      payload: {
        exp: moment().add(30000, 'seconds').unix(),
        iat: moment().unix(),
        sub: username,
      },
      secret: 'random_secret',
    });
    SuccessResponse({ res, body: token });
  });

  @TryCatchAsyncDec
  public async testMysql(req: Request, res: Response) {
    const { username, age } = req.body;
    console.log(username, age);
    const result = await controllerServices.appservice.createSQLUser({ username, age });
    SuccessResponse({ res, body: result });
  }
}
// const appController = new AppController();
export { AppController };
