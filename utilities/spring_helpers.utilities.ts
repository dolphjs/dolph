import 'reflect-metadata';
import { SHIELD_METADATA_KEY } from '../decorators/spring/meta_data_keys.decorators';
import { Middleware } from '../common';

export const getShieldMiddlewares = (targetClass: any): Middleware[] | undefined => {
  return Reflect.getMetadata(SHIELD_METADATA_KEY, targetClass.prototype);
};
