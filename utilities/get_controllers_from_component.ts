import 'reflect-metadata';

import { DolphControllerHandler } from '../classes';
import { Dolph } from '../common';

export function getControllersFromMetadata<T extends DolphControllerHandler<Dolph>>(target: {
    new (): { controllers?: Array<{ new (): T }> };
}): Array<{ new (): T }> | undefined {
    return Reflect.getMetadata('controllers', target.prototype);
}
