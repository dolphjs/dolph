import { Model } from 'mongoose';

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
function InjectMongo(propertyName: string, model: Model<any>) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        const Wrapped = class extends constructor {
            [propertyName]: Model<any> = model;
        };
        Object.defineProperty(Wrapped, 'name', { value: constructor.name, configurable: true });
        return Wrapped;
    };
}

export { InjectMongo };
