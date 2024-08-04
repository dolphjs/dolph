import 'reflect-metadata';
import { SHIELD_METADATA_KEY, UN_SHIELD_METADATA_KEY } from '../decorators/spring/meta_data_keys.decorators';
import { Middleware } from '../common';

export const getShieldMiddlewares = (targetClass: any): Middleware[] | undefined => {
  return Reflect.getMetadata(SHIELD_METADATA_KEY, targetClass.prototype);
};

export const getUnShieldMiddlewares = (targetMethod: any): Middleware[] | undefined => {
  return Reflect.getMetadata(UN_SHIELD_METADATA_KEY, targetMethod);
};

export const getFunctionNames = (arr: Function[]) => {
  return arr.map((fn) => fn.name);
};

export const stringifyFunction = (func: Function) => func.toString();
