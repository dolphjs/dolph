import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, DRequest, DResponse, IPayload, SuccessResponse } from '../../../../../common';
import { DBody, DPayload, DReq, DRes, Get, Post, Route, UseMiddleware } from '../../../../../decorators';
import { generateJWTwithHMAC } from '../../../../../utilities';
import { CreateUserDto } from './user.dto';
import { authShield } from './user.shield';
import { User2Service } from './user2.service';

@Route('user2')
export class User2Controller extends DolphControllerHandler<Dolph> {
    private User2Service: User2Service;
    constructor() {
        super();
    }

    @Get('')
    get(req: DRequest, res: DResponse) {
        return req.query;
    }

    @UseMiddleware(authShield)
    @Post('')
    async print(@DReq() req: DRequest, @DRes() res: DResponse, @DPayload() payload: IPayload) {
        console.log(payload);

        SuccessResponse({ res, body: payload });
    }

    @Post('login')
    async login(@DRes() res, @DBody(CreateUserDto) body: CreateUserDto) {
        const accessToken = this.signToken(body.email, new Date(Date.now() + 3000 * 1000));
        SuccessResponse({ res, body: accessToken, ...body });
    }

    private signToken(userId: string, expires: Date): string {
        const payload: IPayload = {
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(expires.getTime() / 1000),
        };

        return generateJWTwithHMAC({ payload, secret: '12357373738388383992ndnd' });
    }
}
