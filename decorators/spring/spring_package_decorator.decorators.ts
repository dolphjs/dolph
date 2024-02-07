import 'reflect-metadata';
import { normalizePath } from '../../utilities/normalize_path.utilities';
import { ComponentParams, Dolph, Middleware } from '../../common';
import { DolphControllerHandler } from '../../classes';
import clc from 'cli-color';
import { logger } from '../../utilities';
import { SHIELD_METADATA_KEY } from './meta_data_keys.decorators';

export const Route = (path: string = ''): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata('basePath', normalizePath(path), target.prototype);
  };
};

export const Shield = (middlewares: Middleware[]): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata(SHIELD_METADATA_KEY, middlewares, target.prototype);
  };
};
export const UseMiddlware = (middleware: Middleware): MethodDecorator => {
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

export const Component = <T extends Dolph>({ controllers }: ComponentParams<T>): ClassDecorator => {
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
    return (target: any) => {
      Reflect.defineMetadata('controllers', controllers, target.prototype);
    };
  } else {
    logger.error(clc.red('Provide an array of controllers with type `new (): T` '));
  }
};
