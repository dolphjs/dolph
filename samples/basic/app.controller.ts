import { NextFunction, Request, Response } from 'express';
import { DolphControllerHandler, DolphServiceHandler, JwtAuthDec } from '../../common/classes';
import { TryCatchAsyncFn, TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { BadRequestException, SuccessResponse } from '../../common/api';
import { generateJWTwithHMAC } from '../../common/utilities/auth';
import moment from 'moment';
class AppController extends DolphControllerHandler<string> {
  serviceHandlers: DolphServiceHandler<string>[] = [new AppService()];

  protected readonly appService = () => {
    const service = this.getHandler('app');
    if (service instanceof AppService) {
      return service;
    }
  };

  public readonly sendGreeting = TryCatchFn((req: Request, res: Response) => {
    const { body } = req;
    const response = this.appService()?.greeting(body);
    SuccessResponse({ res, msg: response });
  });

  @(new JwtAuthDec().Verify('random_secret'))
  async createUser(req: Request, res: Response) {
    const { body } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
    const data = new AppController().appService()?.createUser(body);
    SuccessResponse({ res, body: data });
  }

  public register = TryCatchAsyncFn(async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;
    const token = generateJWTwithHMAC({
      payload: {
        exp: moment.duration(3000, 'seconds').asSeconds(),
        iat: moment.duration(5000, 'seconds').asSeconds(),
        sub: username,
      },
      secret: 'random_secret',
    });
    SuccessResponse({ res, body: token });
  });
}

export { AppController };
