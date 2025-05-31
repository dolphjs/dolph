import { DolphServiceHandler } from '../../../../../classes';
import { Dolph } from '../../../../../common';

export class User2Service extends DolphServiceHandler<Dolph> {
    constructor() {
        super('userService');
    }

    get() {
        return 'Hello';
    }
}
