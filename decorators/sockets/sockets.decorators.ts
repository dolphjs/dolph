import { Dolph, SocketServicesParams } from '../../common';
import { GlobalServiceRegistry } from '../../core/initialisers/global_service_registry';

/**
 * Finds the shared instance of a service. This runs on first use rather than at
 * decoration time, because the @Component that registers it may not have run yet.
 */
const resolveSharedService = <S>(service: new (...args: unknown[]) => S): S => {
    if (GlobalServiceRegistry.has(service)) return GlobalServiceRegistry.get(service);

    if (Reflect.getMetadata('design:paramtypes', service)?.length) {
        throw new Error(
            `${service.name} has constructor dependencies, so @Socket can't create it. Add it to a @Component's services.`,
        );
    }

    const instance = new service();
    GlobalServiceRegistry.set(service, instance);
    return instance;
};

export const Socket = <T extends Dolph>({ services = [], socketServices }: SocketServicesParams<T>): ClassDecorator => {
    if (!Array.isArray(socketServices)) {
        throw new Error('Provide an array of socket services with type `new (): DolphSocketServiceHandler<Dolph>`');
    }

    return (target: any) => {
        socketServices.forEach((socketService) => {
            services.forEach((service) => {
                Object.defineProperty(socketService.prototype, service.name, {
                    configurable: true,
                    enumerable: true,
                    get: () => resolveSharedService(service),
                    set(value: unknown) {
                        Object.defineProperty(this, service.name, {
                            value,
                            writable: true,
                            configurable: true,
                            enumerable: true,
                        });
                    },
                });
            });
        });

        Reflect.defineMetadata('sockets', socketServices, target.prototype);
    };
};
