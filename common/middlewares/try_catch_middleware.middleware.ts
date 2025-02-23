import { DNextFunc, DRequest, DResponse } from '../interfaces';

/**
 *
 * Creates an asynchronous function wrapped in a try-catch block
 *
 * This is the recommended function to be used for controllers and services that need try-catch
 *
 * @version 1.0.0
 */
const TryCatchAsyncFn =
    <TryCatchAsyncFn>(fn: (req: DRequest, res: DResponse, next: DNextFunc) => Promise<TryCatchAsyncFn>) =>
    (req: DRequest, res: DResponse, next: DNextFunc) => {
        Promise.resolve(fn(req, res, next)).catch((err) => next(err));
    };

/**
 *
 * An asynchronous class-method decorator which wraps a method in a try-catch block
 *
 * Should be used as a top-most decorator
 * @version 1.0.0
 * @deprecated - see @dolphjs/dolph/decorators
 */
const TryCatchAsyncDec = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        const context = this;
        // console.log(this);
        const [req, res, next] = args;
        try {
            await originalMethod.apply(context, args);
        } catch (err) {
            next(err);
        }
    };

    // return descriptor;
};

/**
 *
 * A class-method decorator which wraps a method in a try-catch block
 *
 * Should be used as a top-most decorator
 *
 * @version 1.0.4
 */
const TryCatchDec = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
        const context = this;
        // console.log(this);
        const [req, res, next] = args;
        try {
            originalMethod.apply(context, args);
        } catch (err) {
            next(err);
        }
    };

    // return descriptor;
};

/**
 *
 * Creates a function wrapped in a try-catch block
 *
 * This is the recommended function to be used for controllers and services that  don't use try-catch blocks
 *
 * @version 1.0.0
 */
const TryCatchFn =
    (fn: (req: DRequest, res: DResponse, next: DNextFunc) => void) => (req: DRequest, res: DResponse, next: DNextFunc) => {
        Promise.resolve(fn(req, res, next)).catch((err) => next(err));
    };

export { TryCatchAsyncFn, TryCatchFn, TryCatchAsyncDec, TryCatchDec };
