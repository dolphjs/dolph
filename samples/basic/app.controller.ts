import { DolphControllerHandler } from '../../classes';
import { AppService } from './app.service';
import { BadRequestException, DolphAsyncMiddleware, DolphMiddleware, DRequest, DResponse, Dolph } from '../../common';
import { generateJWTwithHMAC, newAuthCookie } from '../../utilities';
import moment from 'moment';
import { InjectServiceHandler } from '../../decorators';

@InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appservice' }])
class ControllerService {
    appservice!: AppService;
}

const controllerServices = new ControllerService();

// Handlers on an Express router don't get @Route's return values or error handling,
// so these send their own responses and use the Dolph middleware wrappers.
class AppController extends DolphControllerHandler<Dolph> {
    public readonly sendGreeting = DolphMiddleware((req: DRequest, res: DResponse) => {
        res.json({ message: controllerServices.appservice.greeting(req.body) });
    });

    public readonly createUser = DolphAsyncMiddleware(async (req: DRequest, res: DResponse) => {
        const { body, file } = req;
        if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
        const data = await controllerServices.appservice.createUser(body);
        res.json({ data, file, payload: req.payload });
    });

    public readonly register = DolphAsyncMiddleware(async (req: DRequest, res: DResponse) => {
        const { username } = req.body;
        const token = generateJWTwithHMAC({
            payload: {
                exp: moment().add(30000, 'seconds').unix(),
                iat: moment().unix(),
                sub: username,
            },
            secret: 'random_secret',
        });
        res.json({ token });
    });

    public readonly testCookieFn = DolphAsyncMiddleware(async (_req: DRequest, res: DResponse) => {
        const cookieValue = newAuthCookie('user_id_00', new Date(Date.now() + 100000), 'random_secret', { info: 'yeah' });
        res.cookie(cookieValue.name, cookieValue.value, {
            expires: cookieValue.expires,
            secure: cookieValue.secure,
            httpOnly: cookieValue.httpOnly,
            sameSite: cookieValue.sameSite,
        });

        res.send('done');
    });

    public readonly testCookieVerify = DolphAsyncMiddleware(async (req: DRequest, res: DResponse) => {
        res.json(req.payload);
    });
}

export { AppController };
