import { Request, Response } from 'express';
import { DolphControllerHandler, DolphServiceHandler } from '../../common/classes';
import { TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { SuccessResponse } from '../../common/api';

class AppController extends DolphControllerHandler<string> {
  serviceHandlers: DolphServiceHandler<string>[] = [new AppService()];

  appService = () => {
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
}

export { AppController };
