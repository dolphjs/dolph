import { DolphServiceHandler } from '../../../../../classes';
import { Dolph } from '../../../../../common';
import { InjectMongo } from '../../../../../decorators';
import { Model } from 'mongoose';
import { UserModel, IUser } from './user.model';
import { User2Service } from './user2.service';

@InjectMongo('userModel', UserModel)
export class UserService extends DolphServiceHandler<Dolph> {
    userModel!: Model<IUser>;
    users: { name: string; age: number; tag: string }[] = [];

    constructor(private User2Service: User2Service) {
        super('userservice');
    }

    createUser(age: number, name: string): { name: string; age: number }[] {
        this.users.push({ age, name, tag: this.User2Service.get() });
        return this.users;
    }
}
