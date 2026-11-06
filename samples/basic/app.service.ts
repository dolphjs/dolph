import { InjectMongo } from '../../decorators';
import { DolphServiceHandler } from '../../classes';
import { IUser, userModel } from './app.model';
import { Model } from 'mongoose';
import { Dolph } from '../../common';
import { NewService } from './new.service';

@InjectMongo('userModel', userModel)
class AppService extends DolphServiceHandler<Dolph> {
    userModel!: Model<IUser>;
    NewService: NewService;

    constructor() {
        super('appService');
    }

    greeting = (body: { name: string; age: number }) => {
        const greeting = `Hi ${body.name}, wow you are ${body.age} years old`;
        return greeting;
    };

    createUser = async (body: any) => {
        const data = await this.userModel.create(body);
        return data;
    };
}

export { AppService };
