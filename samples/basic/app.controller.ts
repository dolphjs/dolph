import { DolphControllerHandler, DolphServiceHandler, JWTAuthVerifyDec } from '../../classes';
import { TryCatchAsyncDec, TryCatchAsyncFn, TryCatchFn } from '../../common/middlewares';
import { AppService } from './app.service';
import { BadRequestException, DNextFunc, DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { generateJWTwithHMAC, newAuthCookie } from '../../utilities';
import moment from 'moment';
import { MediaParser } from '../../utilities';
import { InjectServiceHandler } from '../../decorators';

@InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appservice' }])
class ControllerService {
  appservice!: AppService;
}

const controllerServices = new ControllerService();
class AppController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
    this.createUser = this.createUser.bind(this);
  }

  public readonly sendGreeting = TryCatchFn((req: DRequest, res: DResponse) => {
    const { body } = req;
    const response = controllerServices.appservice.greeting(body);
    SuccessResponse({ res, msg: response });
  });

  @TryCatchAsyncDec
  @JWTAuthVerifyDec('random_secret')
  @MediaParser({ fieldname: 'upload', type: 'single', extensions: ['.png'] })
  public async createUser(req: DRequest, res: DResponse) {
    const { body, file } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
    const data = await controllerServices.appservice.createUser(body);
    SuccessResponse({ res, body: { data, file: file, payload: req.payload } });
  }

  public readonly register = TryCatchAsyncFn(async (req: DRequest, res: DResponse, next: DNextFunc) => {
    const { username } = req.body;
    console.log(req.file);
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
  public async testMysql(req: DRequest, res: DResponse) {
    const { username, age } = req.body;
    console.log(username, age);
    const result = await controllerServices.appservice.createSQLUser({ username, age });
    SuccessResponse({ res, body: result });
  }

  @TryCatchAsyncDec
  public async testCookieFn(req: DRequest, res: DResponse) {
    const cookieValue = newAuthCookie('user_id_00', 100000, 'random_secret', { info: 'yeah' });
    res.cookie(cookieValue.name, cookieValue.value, {
      expires: cookieValue.expires,
      secure: cookieValue.secure,
      httpOnly: cookieValue.httpOnly,
    });

    res.send('done');
  }

  @TryCatchAsyncDec
  public async testCookieVerify(req: DRequest, res: DResponse) {
    const payload = req.payload;

    res.json(payload);
  }
}
// const appController = new AppController();
export { AppController };
