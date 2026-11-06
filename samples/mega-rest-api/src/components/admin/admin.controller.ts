import { DolphControllerHandler, jwtAuth } from '../../../../../classes';
import { DRequest, DResponse, Dolph } from '../../../../../common';
import { Get, InjectServiceHandler, Post, Route, Shield } from '../../../../../decorators';
import { APP_SECRET } from '../../constants';
import { AdminService } from './admin.service';

const authorizeAdmin = async (payload: any) => payload?.role === 'admin';

@InjectServiceHandler([{ serviceHandler: AdminService, serviceName: 'adminService' }])
class AdminControllerServices {
    adminService!: AdminService;
}

const adminControllerServices = new AdminControllerServices();

@Shield(jwtAuth(APP_SECRET, { authorize: authorizeAdmin }))
@Route('/admin')
export class AdminController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('/logs')
    getLogs(_req: DRequest) {
        return { logs: adminControllerServices.adminService.allLogs() };
    }

    @Post('/tasks/reindex')
    reindex(req: DRequest) {
        const log = adminControllerServices.adminService.pushLog('reindex', String(req.payload?.sub || 'unknown'));
        return { started: true, log };
    }
}
