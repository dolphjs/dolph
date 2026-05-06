import { DolphServiceHandler } from '../../../../../classes';
import { Dolph } from '../../../../../common';

export class FileService extends DolphServiceHandler<Dolph> {
    private uploads: any[] = [];

    constructor() {
        super('file-service');
    }

    save(payload: any) {
        this.uploads.push(payload);
        return payload;
    }

    list() {
        return this.uploads;
    }
}
