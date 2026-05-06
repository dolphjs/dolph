import { DolphControllerHandler } from '../../../../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../../../../common';
import { Get, Route } from '../../../../../decorators';

@Route('/health')
export class HealthController extends DolphControllerHandler<Dolph> {
    @Get('/')
    check(req: DRequest, res: DResponse) {
        SuccessResponse({
            res,
            body: {
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                service: 'mega-rest-api-sample',
            },
        });
    }
}
