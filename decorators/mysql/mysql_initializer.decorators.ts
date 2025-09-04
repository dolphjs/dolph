import { Model, ModelStatic } from 'sequelize';
/**
 *
 * this decorator is used to inject  a mongoose model into the serviceHandler as a method
 *
 * @param propertyName takes the name of the mongoose model
 * @param model  takes the actual mognoose model imported from the models dir
 *
 *
 * @version 2.0.0
 */

function InjectMySQL<T extends { new (...args: any[]): {} }>(propertyName: string, model: ModelStatic<Model<any, any>>) {
    return function (constructor: T) {
        const Wrapped = class extends constructor {
            [propertyName]: ModelStatic<Model<any, any>> = model;
        };
        // Preserving the original class name after extension
        Object.defineProperty(Wrapped, 'name', { value: constructor.name, configurable: true });
        return Wrapped;
    };
}

export { InjectMySQL };
