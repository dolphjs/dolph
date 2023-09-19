import { InjectMongo, InjectMySQL } from '../../decorators';
import { DolphServiceHandler } from '../../classes';
import { userModel } from './app.model';
import { Model, Document } from 'mongoose';
import { User } from './app.schema';
import { ModelStatic, Model as SqlModel } from 'sequelize';

@InjectMongo('userModel', userModel)
@InjectMySQL('userMySqlModel', User)
class AppService extends DolphServiceHandler<'app'> {
  userModel!: Model<Document>;
  userMySqlModel!: ModelStatic<SqlModel<any, any>>;

  constructor() {
    super('app');
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
