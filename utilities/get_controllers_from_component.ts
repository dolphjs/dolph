import 'reflect-metadata';

export function getControllersFromMetadata<T extends object>(target: {
    new (): { controllers?: Array<{ new (): T }> };
}): Array<{ new (): T }> | undefined {
    return Reflect.getMetadata('controllers', target.prototype);
}
