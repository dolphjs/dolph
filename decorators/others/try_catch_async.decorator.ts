/**
 * An asynchronous class-method decorator which wrxaps a method in a try-catch block
 * @version 1.4.3
 * @deprecated
 */
export const TryCatchAsyncDec = () => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const [, , next] = args;
            try {
                await originalMethod.apply(this, args);
            } catch (err) {
                next(err);
            }
        };
    };
};
