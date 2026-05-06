import { DolphControllerHandler, JWTAuthorizeDec } from '../../../../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../../../../common';
import { Get, InjectServiceHandler, Post, Route } from '../../../../../decorators';
import { APP_SECRET } from '../../constants';
import { AdminService } from './admin.service';

const authorizeAdmin = async (payload: any) => payload?.role === 'admin';

@InjectServiceHandler([{ serviceHandler: AdminService, serviceName: 'adminService' }])
class AdminControllerServices {
    adminService!: AdminService;
}

const adminControllerServices = new AdminControllerServices();

@Route('/admin')
export class AdminController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('/logs')
    @JWTAuthorizeDec(APP_SECRET, authorizeAdmin)
    getLogs(_req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { logs: adminControllerServices.adminService.allLogs() } });
    }

    @Post('/tasks/reindex')
    @JWTAuthorizeDec(APP_SECRET, authorizeAdmin)
    reindex(req: DRequest, res: DResponse) {
        const log = adminControllerServices.adminService.pushLog('reindex', String(req.payload?.sub || 'unknown'));
        SuccessResponse({ res, body: { started: true, log } });
    }
}
