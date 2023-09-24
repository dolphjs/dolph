import { Model } from 'mongoose';

/**
 *
 * this decorator is used to inject  a mongoose model into the serviceHandler as a method
 *
 * @param propertyName takes the name of the mongoose model
 * @param model  takes the actual mognoose model imported from the models dir
 *
 *
 * @version 1.0.1
 */
function InjectMongo(propertyName: string, model: Model<any>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      //@ts-expect-errors
      [propertyName]: Model<any> = model as Model<any>;
    };
  };
}

export { InjectMongo };
