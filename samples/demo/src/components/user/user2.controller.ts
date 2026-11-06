import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, DRequest, DResponse, IPayload } from '../../../../../common';
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
    get(req: DRequest) {
        return req.query;
    }

    @UseMiddleware(authShield)
    @Post('')
    async print(@DReq() req: DRequest, @DPayload() payload: IPayload) {
        console.log(payload);

        return payload;
    }

    @Post('login')
    async login(@DBody(CreateUserDto) body: CreateUserDto) {
        const accessToken = this.signToken(body.email, new Date(Date.now() + 3000 * 1000));
        return { accessToken, ...body };
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
