import { DolphControllerHandler } from '../classes';
import { DolphComponent } from '../common';

export function isComponentClass(obj: any): obj is DolphComponent<any> {
    return (
        typeof obj === 'object' &&
        'controllers' in obj &&
        Array.isArray(obj.controllers) &&
        obj.controllers.every((item: any) => typeof item === 'function' && item.prototype instanceof DolphControllerHandler)
    );
}
