import { DolphServiceHandler } from '../../common/classes';

class AppService extends DolphServiceHandler<'app'> {
  protected schema: any;
  constructor() {
    super('app');
  }

  greeting = (body: { name: string; age: number }) => {
    const greeting = `Hi ${body.name}, wow you are ${body.age} years old`;
    return greeting;
  };

  createUser = (body: any) => {
    const data = {
      name: body.name,
      age: body.age,
      height: `${body.height}m`,
      occupation: body.work,
    };
    return data;
  };
}

export { AppService };
