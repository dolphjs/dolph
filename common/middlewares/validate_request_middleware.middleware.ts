import { NextFunction, Request, Response } from 'express';
import { BadRequestException, pick } from '../api';
import Joi = require('joi');
import { DNextFunc, DRequest, DResponse } from '../interfaces';

/**
 *
 *  dolphjs middleware used to validate a request object form the client
 *
 *  it's used in conjunction with JOI in order to work
 *
 *  provides validation for `body`, `params` & `query` objects
 *
 *  - see [https://github.com/dolphjs/dolph#README] for usage
 * @version 1.0.0
 */
const validateRequestMiddleware =
    (schema: any) => (req: Request | DRequest, res: Response | DResponse, next: NextFunction | DNextFunc) => {
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
    };

export { validateRequestMiddleware as reqValidatorMiddleware };
