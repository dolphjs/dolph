import 'reflect-metadata';
import { normalizePath } from '../../utilities/normalize_path.utilities';
import { ComponentParams, Dolph, Middleware } from '../../common';
import { DolphControllerHandler } from '../../classes';
import clc from 'cli-color';
import { logger } from '../../utilities';
import { SHIELD_METADATA_KEY, UN_SHIELD_METADATA_KEY } from './meta_data_keys.decorators';
import { GlobalInjection } from '../../core';
import { any } from 'joi';

export const Route = (path: string = ''): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata('basePath', normalizePath(path), target.prototype);
    };
};

export const Shield = (middlewares: Middleware | Middleware[]): ClassDecorator => {
    return (target: any) => {
        let middlewareList: Middleware[] = Array.isArray(middlewares) ? middlewares : [middlewares];

        Reflect.defineMetadata(SHIELD_METADATA_KEY, middlewareList, target.prototype);
    };
};

export const UnShield = (middlewares: Middleware | Middleware[]): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        let middlewareList: Middleware[] = Array.isArray(middlewares) ? middlewares : [middlewares];

        Reflect.defineMetadata(UN_SHIELD_METADATA_KEY, middlewareList, descriptor.value);
    };
};

export const UseMiddleware = (middleware: Middleware): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const existingMiddleware: Middleware[] = Reflect.getMetadata('middleware', descriptor.value) || [];
        existingMiddleware.push(middleware);
        Reflect.defineMetadata('middleware', existingMiddleware, descriptor.value);
    };
};

export const Get = (path: string = ''): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const classPath = Reflect.getMetadata('basePath', target.constructor.prototype) || '';
        Reflect.defineMetadata('method', 'get', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
    };
};

export const Post = (path: string = ''): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const classPath = Reflect.getMetadata('basePath', target.constructor.prototype) || '';
        Reflect.defineMetadata('method', 'post', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
    };
};

export const Patch = (path: string = ''): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const classPath = Reflect.getMetadata('basePath', target.constructor.prototype) || '';
        Reflect.defineMetadata('method', 'patch', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
    };
};

export const Put = (path: string = ''): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const classPath = Reflect.getMetadata('basePath', target.constructor.prototype) || '';
        Reflect.defineMetadata('method', 'put', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
    };
};

export const Delete = (path: string = ''): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const classPath = Reflect.getMetadata('basePath', target.constructor.prototype) || '';
        Reflect.defineMetadata('method', 'delete', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
    };
};

export const Component = <T extends Dolph>({ controllers, services }: ComponentParams<T>): ClassDecorator => {
    if (
        !(
            Array.isArray(controllers) &&
            controllers.every((item) => typeof item === 'function' && item.prototype instanceof DolphControllerHandler)
        )
    ) {
        logger.error(
            clc.red(
                'Component decorator: Invalid `controllers` array. Each item must be a class extending DolphControllerHandler.',
            ),
        );
        return (target: any) => target; // No-op decorator
    }
    if (!(Array.isArray(services) && services.every((item) => typeof item === 'function'))) {
        logger.error(clc.red('Component decorator: Invalid `services` array. Each item must be a class.'));
        return (target: any) => target; // No-op decorator
    }

    return (target: any) => {
        Reflect.defineMetadata('controllers', controllers, target.prototype);
        Reflect.defineMetadata('services', services, target.prototype);

        // Tracks service classes currently in the process of instantiation to detect cycles
        const servicesBeingResolved = new Set<any>();

        // Instantiate services once to be shared by all controllers within this component.
        // This map will hold the singleton instances of the services.
        const serviceInstances = new Map<any, any>();

        function resolveService<S_TYPE>(serviceClass: new (...args: any[]) => S_TYPE): S_TYPE {
            // Check if instance already exists
            if (serviceInstances.has(serviceClass)) {
                return serviceInstances.get(serviceClass) as S_TYPE;
            }

            // Check if this service class is a registered service in the component
            if (!services.includes(serviceClass)) {
                throw new Error(
                    `Resolution error: Service '${serviceClass.name}' is not registered in the component '${target.name}'.`,
                );
            }

            // Check for circular dependency
            if (servicesBeingResolved.has(serviceClass)) {
                const cyclePath =
                    Array.from(servicesBeingResolved)
                        .map((s) => s.name)
                        .join(' -> ') + ` -> ${serviceClass.name}`;
                throw new Error(
                    `Circular dependency detected while resolving service '${serviceClass.name}'. Cycle: ${cyclePath}`,
                );
            }

            // Mark as being resolved (no circular dependency)
            servicesBeingResolved.add(serviceClass);

            // Get constructor parameter types (requires 'emitDecoratorMetadata: true')
            const constructorParamTypes: any[] = Reflect.getMetadata('design:paramtypes', serviceClass) || [];

            const resolvedArgs = constructorParamTypes.map((paramType: any, index: number) => {
                if (!paramType) {
                    // Clean up before throwing
                    servicesBeingResolved.delete(serviceClass);
                    throw new Error(
                        `Cannot resolve constructor parameter ${index} for service '${serviceClass.name}' due to missing type information. ` +
                            `Ensure 'emitDecoratorMetadata: true' in tsconfig.json and that types are properly defined (e.g., not interfaces for DI, or avoid circular type references if metadata generation fails).`,
                    );
                }

                // Prevent self-injection in constructor
                if (paramType === serviceClass) {
                    // Clean up
                    servicesBeingResolved.delete(serviceClass);
                    throw new Error(
                        `Service '${serviceClass.name}' cannot inject itself into its own constructor (parameter ${index}).`,
                    );
                }

                // Recursively resolve the dependency
                try {
                    return resolveService(paramType);
                } catch (e: any) {
                    servicesBeingResolved.delete(serviceClass);
                    // Augment the error with context if it's a resolution error from a deeper call
                    if (
                        e.message.startsWith('Circular dependency detected') ||
                        e.message.startsWith('Resolution error:') ||
                        (e.message.startsWith('Service ') && e.message.includes('cannot inject itself'))
                    ) {
                        // Re-throw specific DI errors
                        throw e;
                    }
                    throw new Error(
                        `Error resolving parameter ${index} ('${paramType.name}') for service '${serviceClass.name}': ${e.message}`,
                    );
                }
            });

            // Instantiate the service
            let instance: S_TYPE;
            try {
                instance = new serviceClass(...resolvedArgs);
            } catch (e: any) {
                // Clean up
                servicesBeingResolved.delete(serviceClass);
                throw new Error(`Error instantiating service '${serviceClass.name}': ${e.message}`);
            }

            // Store instance and clean up resolution tracking
            serviceInstances.set(serviceClass, instance);
            servicesBeingResolved.delete(serviceClass);

            return instance;
        }

        // Instantiate all registered services. This will resolve their dependencies.
        try {
            services.forEach((serviceClass) => {
                if (!serviceInstances.has(serviceClass)) {
                    // This populates `serviceInstances`
                    resolveService(serviceClass);
                }
            });
        } catch (error: any) {
            logger.error(clc.red(`[${target.name}] Failed to initialize services: ${error.message}`));
        }

        // services.forEach((serviceClass) => {
        //     if (!serviceInstances.has(serviceClass.name)) {
        //         try {
        //             serviceInstances.set(serviceClass.name, new serviceClass());
        //         } catch (e: any) {
        //             logger.error(clc.red(`Failed to instantiate service ${serviceClass.name}: ${e.message}`));
        //         }
        //     }
        // });

        // Modify controllers to inject resolved service instances
        // Keep original for metadata if needed
        const originalControllers = [...controllers];
        const modifiedControllers = originalControllers.map((controllerClass: any) => {
            const originalConstructor = controllerClass;
            const newConstructor = function (...args: any[]) {
                const instance = Reflect.construct(originalConstructor, args, new.target || originalConstructor);

                // Inject all resolved service instances onto the controller instance
                serviceInstances.forEach((serviceInstance, sc) => {
                    Object.defineProperty(instance, sc.name, {
                        value: serviceInstance,
                        writable: true,
                        configurable: true,
                        enumerable: true,
                    });
                });
                return instance;
            };

            newConstructor.prototype = originalConstructor.prototype;
            originalConstructor.prototype.constructor = newConstructor;
            // Object.defineProperty(newConstructor, 'name', { value: `Wrapped${originalConstructor.name}` });
            Object.defineProperty(newConstructor, 'name', { value: originalConstructor.name, writable: false });
            // Copy static members
            Object.setPrototypeOf(newConstructor, originalConstructor);

            return newConstructor;
        });

        // Update metadata with modified (wrapped) controllers if the framework uses this to instantiate
        Reflect.defineMetadata('controllers', modifiedControllers, target.prototype);

        logger.info(clc.green(`[${target.name}] Component initialized. Services and controllers processed.`));
    };
};

export const Body = (): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingBodyParameters: number[] = Reflect.getOwnMetadata('bodyParameters', target, propertyKey) || [];

        existingBodyParameters.push(parameterIndex);

        Reflect.defineMetadata('bodyParameters', existingBodyParameters, target, propertyKey);
    };
};

export const Query = (): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingQueryParameters: number[] = Reflect.getOwnMetadata('queryParameters', target, propertyKey) || [];
        existingQueryParameters.push(parameterIndex);
        Reflect.defineMetadata('queryParameters', existingQueryParameters, target, propertyKey);
    };
};

export const Param = (): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingParamParameters: number[] = Reflect.getOwnMetadata('paramParameters', target, propertyKey) || [];
        existingParamParameters.push(parameterIndex);
        Reflect.defineMetadata('paramParameters', existingParamParameters, target, propertyKey);
    };
};

// Todo: implement later in future version
const UseDto = (dto: any): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('dto', dto, target, propertyKey);
    };
};

/**
 *  Renders template for MVC
 *
 * @version 1.0
 */
export function Render(template: string): MethodDecorator {
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata('render', template, descriptor.value);
    };
}

// Unique symbol for metadata key
export const ROUTE_ARGS_METADATA = Symbol('dolph:route_args_metadata');

export const routeParamsArr = ['req', 'res', 'next', 'body', 'query', 'param', 'file', 'payload'];

export interface RouteParamMetadata {
    // Parameter index
    index: number;
    type: 'req' | 'res' | 'next' | 'body' | 'query' | 'param' | 'file' | 'payload';
    // For DTO type, specific param name, etc.
    data?: any;
}

function addParameterMetadata(
    // Prototype of the controller class
    target: Object,
    // Method name
    propertyKey: string | symbol,
    parameterIndex: number,
    type: RouteParamMetadata['type'],
    data?: any,
) {
    const existingMetaData: RouteParamMetadata[] = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, propertyKey) || [];

    // Checks whether a core decorator is already applied to this parameter index
    const previousParamMeta = existingMetaData.find((p) => p.index === parameterIndex);
    if (previousParamMeta) {
        console.warn(
            `DolphJS: Overwriting route parameter decorator at index ${parameterIndex} for ${
                target.constructor.name
            }.${String(propertyKey)}. Previous type: ${previousParamMeta.type}, New type: ${type}`,
        );
    }

    const newParamMetadata: RouteParamMetadata = { index: parameterIndex, type, data };
    // Remove any previous metadata for this specific index before adding the new one
    const updatedMetadata = existingMetaData.filter((p) => p.index !== parameterIndex);
    updatedMetadata.push(newParamMetadata);

    // Sort by index to make processing easier later
    updatedMetadata.sort((a, b) => a.index - b.index);

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, updatedMetadata, target, propertyKey);
}

export function DReq(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'req');
    };
}

export function DRes(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'res');
    };
}

export function DNext(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'next');
    };
}

export function DPayload(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'payload');
    };
}

// TODO: assign a type to Dto
export function DBody(dtoType?: any): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'body', { dtoType });
    };
}

export function DParam(dtoType?: any): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'param', { dtoType });
    };
}

export function DQuery(dtoType?: any): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'query', { dtoType });
    };
}
