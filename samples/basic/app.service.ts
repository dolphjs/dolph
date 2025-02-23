import { InjectMongo, InjectMySQL } from '../../decorators';
import { DolphServiceHandler } from '../../classes';
import { IUser, userModel } from './app.model';
import { Model } from 'mongoose';
import { User } from './app.schema';
import { ModelStatic, Model as SqlModel } from 'sequelize';
import { Dolph } from '../../common';
import { NewService } from './new.service';

@InjectMongo('userModel', userModel)
@InjectMySQL('userMySqlModel', User)
class AppService extends DolphServiceHandler<Dolph> {
    userModel!: Model<IUser>;
    userMySqlModel!: ModelStatic<SqlModel<any, any>>;
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

    createSQLUser = async (body: { username: string; age: string }) => {
        return this.userMySqlModel.create(body);
    };
}

export { AppService };
