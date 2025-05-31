import { DolphServiceHandler } from '../../../../../classes';
import { Dolph } from '../../../../../common';
import { InjectMongo } from '../../../../../decorators';
import { Model } from 'mongoose';
import { UserModel, IUser } from './user.model';

@InjectMongo('userModel', UserModel)
export class UserService extends DolphServiceHandler<Dolph> {
    userModel!: Model<IUser>;
    users: { name: string; age: number }[] = [];

    constructor() {
        super('userservice');
    }

    createUser(age: number, name: string): { name: string; age: number }[] {
        this.users.push({ age, name });
        return this.users;
    }
}
