import { NextFunction, Request, Response } from 'express';
import { DefaultMiddleware } from './default_middleware.middleware';
import { pick } from '../api';
import Joi = require('joi');
import { BadRequestException } from '../api/exceptions';

const validateRequestMiddleware = DefaultMiddleware((schema: any) => (req: Request, res: Response, next: NextFunction) => {
  const acceptedSchema = pick(schema, ['param', 'body', 'query']);
  const object = pick(req, Object.keys(acceptedSchema));
  const { value, error } = Joi.compile(acceptedSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new BadRequestException(errorMessage));
  }

  Object.assign(req, value);
  return next();
});

export { validateRequestMiddleware as reqValidatorMiddleware };
