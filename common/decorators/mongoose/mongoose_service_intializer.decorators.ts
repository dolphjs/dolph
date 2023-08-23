import { Model } from 'mongoose';

/**
 *
 * this decorator is used to inject  a mongoose model into the serviceHandler as a method - v1.0
 *
 * @param propertyName takes the name of the mongoose model
 * @param model  takes the actual mognoose model imported from the models dir
 *
 */
function InjectMongo(propertyName: string, model: Model<Document>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      //@ts-expect-error
      [propertyName]: Model<Document> = model;
    };
  };
}

export { InjectMongo };
