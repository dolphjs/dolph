import { Request, Response } from 'express';
import { DolphControllerHandler, DolphServiceHandler } from '../../common/classes';
import { TryCatchAsyncFn, TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { BadRequestException, SuccessResponse } from '../../common/api';

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

  public readonly createUser = TryCatchAsyncFn(async (req: Request, res: Response) => {
    const { body } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
    const data = this.appService()?.createUser(body);
    SuccessResponse({ res, body: data });
  });
}

export { AppController };
