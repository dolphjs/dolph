import { NextFunction } from 'express';
import { BadRequestException, DNextFunc, DRequest, DResponse, validateRequestAgainstSchema } from '../../common';

export function ValidateReq(schema: any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request | DRequest, res: Response | DResponse, next: NextFunction | DNextFunc) {
            const { value, error } = validateRequestAgainstSchema(schema, req);

            if (error) {
                const errorMessage = error.details.map((details) => details.message).join(', ');
                return next(new BadRequestException(errorMessage));
            }

            Object.assign(req, value);
            return originalMethod.apply(this, [req, res, next]);
        };
    };
}
