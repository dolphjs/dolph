import { DolphServiceHandler } from '../../../../../classes';
import { Dolph, IPayload } from '../../../../../common';
import { generateJWTwithHMAC, newAuthCookie } from '../../../../../utilities';
import moment from 'moment';
import { APP_SECRET } from '../../constants';

export class AuthService extends DolphServiceHandler<Dolph> {
    constructor() {
        super('auth-service');
    }

    createTokenPair(username: string, role: string) {
        const accessPayload: IPayload = {
            sub: username,
            exp: moment().add(1, 'hour').unix(),
            iat: moment().unix(),
            role,
        } as any;
        const refreshPayload: IPayload = {
            sub: `${username}:refresh`,
            exp: moment().add(7, 'days').unix(),
            iat: moment().unix(),
            role,
        } as any;

        return {
            accessToken: generateJWTwithHMAC({ payload: accessPayload, secret: APP_SECRET }),
            refreshToken: generateJWTwithHMAC({ payload: refreshPayload, secret: APP_SECRET }),
        };
    }

    createAuthCookie(username: string) {
        return newAuthCookie(username, new Date(Date.now() + 1000 * 60 * 60 * 24), APP_SECRET, { session: 'active' });
    }
}
