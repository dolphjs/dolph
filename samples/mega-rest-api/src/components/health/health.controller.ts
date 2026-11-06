import { DolphControllerHandler } from '../../../../../classes';
import { DRequest, DResponse, Dolph } from '../../../../../common';
import { Get, Route } from '../../../../../decorators';

@Route('/health')
export class HealthController extends DolphControllerHandler<Dolph> {
    @Get('/')
    check(req: DRequest) {
        return {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            service: 'mega-rest-api-sample',
        };
    }
}
