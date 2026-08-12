import 'reflect-metadata';
import { normalizePath } from '../../utilities/normalize_path.utilities';
import { ComponentParams, Dolph, Middleware } from '../../common';
import { DolphControllerHandler } from '../../classes';
import clc from 'cli-color';
import { logger } from '../../utilities';
import { SHIELD_METADATA_KEY, UN_SHIELD_METADATA_KEY } from './meta_data_keys.decorators';
import { GlobalServiceRegistry } from '../../core/initialisers/global_service_registry';

export const Route = (path = ''): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata('basePath', normalizePath(path), target.prototype);
    };
};

export const Shield = (middlewares: Middleware | Middleware[]): ClassDecorator => {
    return (target: any) => {
        const middlewareList: Middleware[] = Array.isArray(middlewares) ? middlewares : [middlewares];

        Reflect.defineMetadata(SHIELD_METADATA_KEY, middlewareList, target.prototype);
    };
};

export const UnShield = (middlewares: Middleware | Middleware[]): MethodDecorator => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const middlewareList: Middleware[] = Array.isArray(middlewares) ? middlewares : [middlewares];

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

export const Get = (path = ''): MethodDecorator => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('method', 'get', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(path), descriptor.value);
    };
};

export const Post = (path = ''): MethodDecorator => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('method', 'post', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(path), descriptor.value);
    };
};

export const Patch = (path = ''): MethodDecorator => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('method', 'patch', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(path), descriptor.value);
    };
};

export const Put = (path = ''): MethodDecorator => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('method', 'put', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(path), descriptor.value);
    };
};

export const Delete = (path = ''): MethodDecorator => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata('method', 'delete', descriptor.value);
        Reflect.defineMetadata('path', normalizePath(path), descriptor.value);
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
    const resolvedServices = services || [];
    if (!(Array.isArray(resolvedServices) && resolvedServices.every((item) => typeof item === 'function'))) {
        logger.error(clc.red('Component decorator: Invalid `services` array. Each item must be a class.'));
        return (target: any) => target; // No-op decorator
    }

    return (target: any) => {
        Reflect.defineMetadata('controllers', controllers, target.prototype);
        Reflect.defineMetadata('services', resolvedServices, target.prototype);

        // Tracks service classes currently in the process of instantiation to detect cycles
        const servicesBeingResolved = new Set<any>();

        // Instantiate services once to be shared by all controllers within this component.
        // This map will hold the singleton instances of the services.
        const serviceInstances = new Map<any, any>();

        function resolveService<S_TYPE>(serviceClass: new (...args: any[]) => S_TYPE): S_TYPE {
            // 1. Check the application-wide global registry first.
            //    This is the key change that makes services true singletons across components.
            if (GlobalServiceRegistry.has(serviceClass)) {
                // Populate local map so controller injection still works via serviceInstances
                if (!serviceInstances.has(serviceClass)) {
                    serviceInstances.set(serviceClass, GlobalServiceRegistry.get(serviceClass));
                }
                return GlobalServiceRegistry.get(serviceClass) as S_TYPE;
            }

            // 2. Check if instance already exists in local component map (within current resolution pass)
            if (serviceInstances.has(serviceClass)) {
                return serviceInstances.get(serviceClass) as S_TYPE;
            }

            // 3. Check if this service class is a registered service in the component.
            //    We allow cross-component resolution: if a service is already in the global
            //    registry from another component, it was already handled by step 1.
            //    If it's not registered here AND not in the global registry, that's an error.
            if (!resolvedServices.includes(serviceClass)) {
                throw new Error(
                    `Resolution error: Service '${serviceClass.name}' is not registered in the component '${target.name}' ` +
                    `and has not been registered by any other component.`,
                );
            }

            // 4. Check for circular dependency
            if (servicesBeingResolved.has(serviceClass)) {
                const cyclePath =
                    Array.from(servicesBeingResolved)
                        .map((s) => s.name)
                        .join(' -> ') + ` -> ${serviceClass.name}`;
                throw new Error(
                    `Circular dependency detected while resolving service '${serviceClass.name}'. Cycle: ${cyclePath}`,
                );
            }

            // Mark as being resolved
            servicesBeingResolved.add(serviceClass);

            // Get constructor parameter types (requires 'emitDecoratorMetadata: true')
            const constructorParamTypes: any[] = Reflect.getMetadata('design:paramtypes', serviceClass) || [];

            const resolvedArgs = constructorParamTypes.map((paramType: any, index: number) => {
                if (!paramType) {
                    servicesBeingResolved.delete(serviceClass);
                    throw new Error(
                        `Cannot resolve constructor parameter ${index} for service '${serviceClass.name}' due to missing type information. ` +
                            `Ensure 'emitDecoratorMetadata: true' in tsconfig.json and that types are properly defined (e.g., not interfaces for DI, or avoid circular type references if metadata generation fails).`,
                    );
                }

                // Prevent self-injection in constructor
                if (paramType === serviceClass) {
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
                    if (
                        e.message.startsWith('Circular dependency detected') ||
                        e.message.startsWith('Resolution error:') ||
                        (e.message.startsWith('Service ') && e.message.includes('cannot inject itself'))
                    ) {
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
                servicesBeingResolved.delete(serviceClass);
                throw new Error(`Error instantiating service '${serviceClass.name}': ${e.message}`);
            }

            // 5. Store in BOTH the local component map and the global registry.
            //    The global registry ensures cross-component singleton behaviour.
            serviceInstances.set(serviceClass, instance);
            GlobalServiceRegistry.set(serviceClass, instance);
            servicesBeingResolved.delete(serviceClass);

            return instance;
        }

        // Instantiate all registered services. This will resolve their dependencies.
        try {
            resolvedServices.forEach((serviceClass) => {
                if (!serviceInstances.has(serviceClass)) {
                    resolveService(serviceClass);
                }
            });
        } catch (error: any) {
            logger.error(clc.red(`[${target.name}] Failed to Initialise services: ${error.message}`));
        }

        // Modify controllers to inject resolved service instances
        // Keep original for metadata if needed
        const originalControllers = [...controllers];
        const modifiedControllers = originalControllers.map((controllerClass: any) => {
            const originalConstructor = controllerClass;
            // Read constructor param types once at component setup time, not per-instantiation
            const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', originalConstructor) || [];
            const useConstructorInjection = paramTypes.length > 0;

            const newConstructor = function (...args: any[]) {
                if (useConstructorInjection) {
                    // Resolve only the services this controller explicitly declares in its constructor
                    const resolvedArgs = paramTypes.map((paramType: any) => serviceInstances.get(paramType));
                    return Reflect.construct(originalConstructor, resolvedArgs, new.target || newConstructor);
                }

                // Fallback: no constructor params — inject all component services as named properties
                const instance = Reflect.construct(originalConstructor, args, new.target || newConstructor);
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

            // Use Object.create so newConstructor gets its own prototype object that
            // inherits from the original — avoids mutating originalConstructor.prototype.
            newConstructor.prototype = Object.create(originalConstructor.prototype);
            newConstructor.prototype.constructor = newConstructor;
            Object.defineProperty(newConstructor, 'name', { value: originalConstructor.name, writable: false });
            // Copy static members
            Object.setPrototypeOf(newConstructor, originalConstructor);

            return newConstructor;
        });

        // Update metadata with modified (wrapped) controllers if the framework uses this to instantiate
        Reflect.defineMetadata('controllers', modifiedControllers, target.prototype);

        logger.info(clc.green(`[${target.name}] Component Initialised. Services and controllers processed.`));
    };
};

// Todo: implement later in future version
export const UseDto = (dto: any): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
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

export const routeParamsArr = ['req', 'res', 'next', 'body', 'query', 'param', 'file', 'payload', 'headers', 'cookies'];

export interface RouteParamMetadata {
    // Parameter index
    index: number;
    type: 'req' | 'res' | 'next' | 'body' | 'query' | 'param' | 'file' | 'payload' | 'headers' | 'cookies';
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
        logger.warn(
            clc.yellow(
                `DolphJS: Overwriting route parameter decorator at index ${parameterIndex} for ${
                    target.constructor.name
                }.${String(propertyKey)}. Previous type: ${previousParamMeta.type}, New type: ${type}`
            )
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

export function DHeaders(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'headers');
    };
}

export function DCookies(): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        addParameterMetadata(target, propertyKey, parameterIndex, 'cookies');
    };
}
