import { DolphServiceHandler } from '@dolphjs/dolph/classes';
import { Dolph } from '@dolphjs/dolph/common';
import { InjectMongo } from '@dolphjs/dolph/decorators';
import { Model } from 'mongoose';
import { UserModel, IUser } from './user.model';

@InjectMongo('userModel', UserModel)
export class UserService extends DolphServiceHandler<Dolph> {
    userModel!: Model<IUser>;

    constructor() {
        super('userservice');
    }
}
