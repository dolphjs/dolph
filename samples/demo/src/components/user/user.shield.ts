import { DRequest, DResponse, DNextFunc, UnauthorizedException, ForbiddenException } from '../../../../../common';
import { verifyJWTwithHMAC } from '../../../../../utilities';

export const authShield = async (req: DRequest, res: DResponse, next: DNextFunc) => {
    try {
        let authToken = req.headers['authorization'] as string;

        if (!authToken) {
            return next(new UnauthorizedException('Provide a valid authorization token header'));
        }

        const bearer = authToken.split(' ')[0];

        if (bearer !== 'Bearer') return next(new UnauthorizedException('Provide a valid authorization token header'));

        authToken = authToken.split(' ')[1];

        const payload = verifyJWTwithHMAC({
            token: authToken,
            secret: '12357373738388383992ndnd',
        });

        if (!payload) return next(new UnauthorizedException('Invalid or expired token'));

        req.payload = {
            ...(payload as any),
        };

        next();
    } catch (e) {
        next(new UnauthorizedException(e));
    }
};
