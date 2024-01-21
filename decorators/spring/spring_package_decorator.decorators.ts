import 'reflect-metadata';
import { normalizePath } from '../../utilities/normalize_path.utilities';

export const Route = (path: string = ''): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata('basePath', normalizePath(path), target);
  };
};

export const Get = (path: string = ''): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const classPath = Reflect.getMetadata('basePath', target.constructor) || '';
    Reflect.defineMetadata('method', 'get', descriptor.value);
    Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
  };
};

export const Post = (path: string = ''): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    console.log(Reflect.getMetadata('path', target.constructor));
    const classPath = Reflect.getMetadata('basePath', target.constructor) || '';
    Reflect.defineMetadata('method', 'post', descriptor.value);
    Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
  };
};

export const Patch = (path: string = ''): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const classPath = Reflect.getMetadata('basePath', target.constructor) || '';
    Reflect.defineMetadata('method', 'patch', descriptor.value);
    Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
  };
};

export const Put = (path: string = ''): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const classPath = Reflect.getMetadata('basePath', target.constructor) || '';
    Reflect.defineMetadata('method', 'put', descriptor.value);
    Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
  };
};

export const Delete = (path: string = ''): MethodDecorator => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const classPath = Reflect.getMetadata('basePath', target.constructor) || '';
    Reflect.defineMetadata('method', 'delete', descriptor.value);
    Reflect.defineMetadata('path', normalizePath(classPath + path), descriptor.value);
  };
};
