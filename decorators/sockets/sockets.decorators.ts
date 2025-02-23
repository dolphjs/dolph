import clc from 'cli-color';
import { DolphServiceHandler, DolphSocketServiceHandler } from '../../classes';
import { Dolph, SocketServicesParams } from '../../common';
import { logger } from '../../utilities';

function isDolphServiceHandler(classOrInstance: any): classOrInstance is typeof DolphServiceHandler {
    return classOrInstance.prototype instanceof DolphServiceHandler || classOrInstance === DolphServiceHandler;
}

function isDolphSocketServiceHandler(classOrInstance: any): classOrInstance is typeof DolphSocketServiceHandler {
    return classOrInstance.prototype instanceof DolphSocketServiceHandler || classOrInstance === DolphSocketServiceHandler;
}

export const Socket = <T extends Dolph>({ services, socketServices }: SocketServicesParams<T>): ClassDecorator => {
    if (Array.isArray(socketServices)) {
        return (target: any) => {
            socketServices.forEach((socketService) => {
                services.forEach((service) => {
                    const serviceInstance = new service();
                    const serviceName = service.name;

                    Object.defineProperty(socketService.prototype, serviceName, {
                        value: serviceInstance,
                        writable: true,
                        configurable: true,
                        enumerable: true,
                    });
                });
            });

            Reflect.defineMetadata('sockets', socketServices, target.prototype);
        };
    } else {
        logger.error(clc.red('Provide an array of socket services with type `new (): DolphSocketServiceHandler` '));
    }
};
