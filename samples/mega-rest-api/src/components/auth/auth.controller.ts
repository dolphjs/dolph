import { DolphControllerHandler, JWTAuthVerifyDec } from '../../../../../classes';
import { DPayload, DBody, DReq, DRes, Post, Route, Get, UseMiddleware } from '../../../../../decorators';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../../../../common';
import { APP_SECRET } from '../../constants';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import { cookieAuthVerify } from '../../../../../utilities';

@Route('/auth')
export class AuthController extends DolphControllerHandler<Dolph> {
    private AuthService: AuthService;

    constructor() {
        super();
    }

    @Post('/login')
    login(@DBody(LoginDto) body: LoginDto, @DRes() res: DResponse) {
        const role = body.username.includes('admin') ? 'admin' : 'user';
        const tokenPair = this.AuthService.createTokenPair(body.username, role);
        const cookie = this.AuthService.createAuthCookie(body.username);

        res.cookie(cookie.name, cookie.value, {
            expires: cookie.expires,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
        });

        SuccessResponse({
            res,
            body: {
                user: { username: body.username, role },
                ...tokenPair,
            },
        });
    }

    @Post('/refresh')
    refresh(@DBody(RefreshDto) body: RefreshDto, @DRes() res: DResponse) {
        SuccessResponse({
            res,
            body: {
                refreshed: true,
                tokenHint: body.refreshToken.slice(0, 16),
            },
        });
    }

    @Get('/me')
    @JWTAuthVerifyDec(APP_SECRET)
    me(@DReq() req: DRequest, @DRes() res: DResponse, @DPayload() payload: any) {
        SuccessResponse({ res, body: { payload, headers: req.headers } });
    }

    @Get('/cookie-me')
    @UseMiddleware(cookieAuthVerify(APP_SECRET))
    cookieMe(@DPayload() payload: any, @DRes() res: DResponse) {
        SuccessResponse({ res, body: { payload } });
    }
}
