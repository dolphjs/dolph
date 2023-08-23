import { InjectMongo } from '../../common';
import { DolphServiceHandler } from '../../common/classes';
import { userModel } from './app.model';
import { Model, Document } from 'mongoose';

@InjectMongo('userModel', userModel)
class AppService extends DolphServiceHandler<'app'> {
  protected schema: any;
  userModel!: Model<Document>;
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
}

export { AppService };
