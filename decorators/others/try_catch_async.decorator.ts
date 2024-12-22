/**
 * An asynchronous class-method decorator which wraps a method in a try-catch block
 * @version 1.4.3
 */
export const TryCatchAsyncDec = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = this;
      const [req, res, next] = args;
      try {
        await originalMethod.apply(context, args);
      } catch (err) {
        next(err);
      }
    };
  };
};
