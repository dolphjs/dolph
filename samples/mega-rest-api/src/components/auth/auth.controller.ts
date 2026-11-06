import { DolphControllerHandler, jwtAuth } from '../../../../../classes';
import { DPayload, DBody, DReq, DRes, Post, Route, Get, UseMiddleware } from '../../../../../decorators';
import { DRequest, DResponse, Dolph } from '../../../../../common';
import { APP_SECRET } from '../../constants';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';

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
            sameSite: cookie.sameSite,
        });

        return {
            user: { username: body.username, role },
            ...tokenPair,
        };
    }

    @Post('/refresh')
    refresh(@DBody(RefreshDto) body: RefreshDto) {
        return {
            refreshed: true,
            tokenHint: body.refreshToken.slice(0, 16),
        };
    }

    @Get('/me')
    @UseMiddleware(jwtAuth(APP_SECRET))
    me(@DReq() req: DRequest, @DPayload() payload: any) {
        return { payload, headers: req.headers };
    }

    @Get('/cookie-me')
    @UseMiddleware(jwtAuth(APP_SECRET, { cookie: true }))
    cookieMe(@DPayload() payload: any) {
        return { payload };
    }
}
