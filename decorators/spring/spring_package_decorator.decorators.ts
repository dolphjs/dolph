import 'reflect-metadata';
import { normalizePath } from '../../utilities/normalize_path.utilities';
import { ComponentParams, Dolph, Middleware } from '../../common';
import { DolphControllerHandler } from '../../classes';
import clc from 'cli-color';
import { logger } from '../../utilities';
import { SHIELD_METADATA_KEY, UN_SHIELD_METADATA_KEY } from './meta_data_keys.decorators';
import { GlobalInjection } from '../../core';
// import { serviceRegistry } from '../../core/initializers/service_registeries.core';

export const Route = (path: string = ''): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata('basePath', normalizePath(path), target.prototype);
  };
};

export const Shield = (middlewares: Middleware | Middleware[]): ClassDecorator => {
  return (target: any) => {
    let middlewareList: Middleware[] = [];

    if (Array.isArray(middlewares)) {
      middlewareList = middlewares;
    } else if (middlewares) {
      middlewareList = [middlewares];
    }

    Reflect.defineMetadata(SHIELD_METADATA_KEY, middlewareList, target.prototype);
  };
};

export const UnShield = (middlewares: Middleware | Middleware[]): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    let middlewareList: Middleware[] = [];

    if (Array.isArray(middlewares)) {
      middlewareList = middlewares;
    } else if (middlewares) {
      middlewareList = [middlewares];
    }

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
    Array.isArray(controllers) &&
    controllers.every((item) => {
      const isFunction = typeof item === 'function';
      const isInstanceOfDolphControllerHandler = item.prototype instanceof DolphControllerHandler;

      if (!isFunction || !isInstanceOfDolphControllerHandler) {
        logger.error(clc.red('Invalid controller:', item));
      }

      return isFunction && isInstanceOfDolphControllerHandler;
    })
  ) {
    const injectedServices = new Set<string>();

    const injectServices = (target: any, services: any[], depth: number = 0) => {
      if (depth > services.length) {
        // Prevent circular dependency overflow
        return;
      }

      services.forEach((service) => {
        const serviceInstance = new service();
        const serviceName = service.name;

        // Skip already injected services to avoid circular dependency
        if (!injectedServices.has(serviceName)) {
          GlobalInjection(serviceName, serviceInstance);

          // Get the prototype of the target instance
          const targetPrototype = Object.getPrototypeOf(target);

          // Inject the service instance into the target
          if (typeof targetPrototype === 'object' && targetPrototype !== null) {
            Object.defineProperty(targetPrototype, serviceName, {
              value: serviceInstance,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          }

          // Track the service as injected
          injectedServices.add(serviceName);

          // Recursively inject other services into this service
          injectServices(
            serviceInstance,
            services.filter((s) => s !== service),
            depth + 1,
          );
        }
      });
    };

    return (target: any) => {
      Reflect.defineMetadata('controllers', controllers, target.prototype);

      // Inject services into each controller
      controllers.forEach((controller) => {
        const controllerInstance = new controller();
        injectServices(controllerInstance, services);
      });

      // Inject services into each other, excluding themselves
      services.forEach((service) => {
        const serviceInstance = new service();
        injectServices(
          serviceInstance,
          services.filter((s) => s !== service),
        );
      });
    };
  } else {
    logger.error(clc.red('Provide an array of controllers with type `new (): T` '));
  }
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
