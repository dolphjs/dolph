import { NextFunction } from "express";
import { BadRequestException, DNextFunc, DRequest, DResponse, pick } from "../../common";
import Joi from "joi";

export function ValidateReq(schema: any){
    return function(target: any, propertyKey:string, descriptor: PropertyDescriptor){
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request | DRequest, res: Response | DResponse, next: NextFunction | DNextFunc) {
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
        return originalMethod.apply(this, [req, res, next]);
        };   
    }
}