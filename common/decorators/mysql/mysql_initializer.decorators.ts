import { Model, ModelStatic } from 'sequelize';
/**
 *
 * this decorator is used to inject  a mongoose model into the serviceHandler as a method
 *
 * @param propertyName takes the name of the mongoose model
 * @param model  takes the actual mognoose model imported from the models dir
 *
 *
 * @version 1.0.0
 */

function InjectMySQL<T extends { new (...args: any[]): {} }>(propertyName: string, model: ModelStatic<Model<any, any>>) {
  return function (constructor: T) {
    return class extends constructor {
      //@ts-expect-error
      [propertyName]: ModelStatic<Model<any, any>> = model;
    };
  };
}

export { InjectMySQL };
