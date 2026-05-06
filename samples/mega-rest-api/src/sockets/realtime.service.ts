import { DolphServiceHandler } from '../../../../classes';
import { Dolph } from '../../../../common';

export class RealtimeAuditService extends DolphServiceHandler<Dolph> {
    constructor() {
        super('realtime-audit-service');
    }

    track(event: string, data: unknown) {
        return { event, data, at: new Date().toISOString() };
    }
}
