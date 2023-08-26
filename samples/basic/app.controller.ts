import { NextFunction, Request, Response } from 'express';
import { DolphControllerHandler, DolphServiceHandler, JWTAuthVerifyDec } from '../../common/classes';
import { TryCatchAsyncDec, TryCatchAsyncFn, TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { BadRequestException, SuccessResponse } from '../../common/api';
import { generateJWTwithHMAC } from '../../common/utilities/auth';
import moment from 'moment';
import { InjectServiceHandler, MediaParser } from '../../common';

@InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appservice' }])
class AppController extends DolphControllerHandler<string> {
  appservice!: AppService;

  public readonly sendGreeting = TryCatchFn((req: Request, res: Response) => {
    const { body } = req;
    const response = this.appservice.greeting(body);
    SuccessResponse({ res, msg: response });
  });

  @JWTAuthVerifyDec('random_secret')
  @MediaParser({ fieldname: 'upload', type: 'single', extensions: ['.png'] })
  @TryCatchAsyncDec
  public async createUser(req: Request, res: Response) {
    const { body, file } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
    const data = await new AppController().appservice.createUser(body);
    SuccessResponse({ res, body: { data, filename: file.filename } });
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
}

export { AppController };
