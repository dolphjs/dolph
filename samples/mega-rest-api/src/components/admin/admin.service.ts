import { DolphServiceHandler } from '../../../../../classes';
import { Dolph } from '../../../../../common';

export class AdminService extends DolphServiceHandler<Dolph> {
    private auditLogs: Array<{ action: string; actor: string; at: string }> = [];

    constructor() {
        super('admin-service');
    }

    pushLog(action: string, actor: string) {
        const log = { action, actor, at: new Date().toISOString() };
        this.auditLogs.push(log);
        return log;
    }

    allLogs() {
        return this.auditLogs;
    }
}
