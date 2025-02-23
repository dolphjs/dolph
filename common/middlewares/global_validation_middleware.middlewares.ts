//@ts-nocheck
import { plainToClass } from 'class-transformer';
import { DNextFunc, DRequest, DResponse } from '../interfaces';
import { validate, ValidationError } from 'class-validator';

// does not work for current use
export const validationMiddlewareOne = async (req: DRequest, res: DResponse, next: DNextFunc) => {
    const routeHandler = req.route?.stack?.find((layer) => layer.method === req.method.toLowerCase())?.handle;
    const dto = Reflect.getMetadata('dto', routeHandler);

    if (!dto) {
        return next();
    }

    const bodyObject = plainToClass(dto, req.body);
    const queryObject = plainToClass(dto, req.query);
    const paramObject = plainToClass(dto, req.params);

    const errors: ValidationError[] = await Promise.all([
        validate(bodyObject),
        validate(queryObject),
        validate(paramObject),
    ]).then((results) => [].concat(...results));

    if (errors.length > 0) {
        const constraints = errors
            .map((error) => Object.values(error.constraints || {}))
            .reduce((acc, val) => acc.concat(val), []);
        return res.status(400).json({ message: 'Validation failed', errors: constraints });
    }

    if (req.body) {
        req.body = bodyObject;
    }

    if (req.params) {
        req.params = paramObject;
    }

    if (req.query) {
        req.query = queryObject;
    }

    next();
};

export const validateBodyMiddleware = (dto: any) => {
    return async (req: DRequest, res: DResponse, next: DNextFunc) => {
        const object = plainToClass(dto, req.body);

        const errors: ValidationError[] = await validate(object);

        if (errors.length > 0) {
            const constraints = errors
                .map((error) => Object.values(error.constraints || {}))
                .reduce((acc, val) => acc.concat(val), [])
                .join(', ');
            return res.status(400).json({ message: 'Validation failed', error: constraints });
        } else {
            req.body = object;
            next();
        }
    };
};

export const validateQueryMiddleware = (dto: any) => {
    return async (req: DRequest, res: DResponse, next: DNextFunc) => {
        const object = plainToClass(dto, req.query);

        const errors: ValidationError[] = await validate(object);

        if (errors.length > 0) {
            const constraints = errors
                .map((error) => Object.values(error.constraints || {}))
                .reduce((acc, val) => acc.concat(val), [])
                .join(', ');
            return res.status(400).json({ message: 'Validation failed', error: constraints });
        } else {
            req.body = object;
            next();
        }
    };
};

export const validateParamMiddleware = (dto: any) => {
    return async (req: DRequest, res: DResponse, next: DNextFunc) => {
        const object = plainToClass(dto, req.query);

        const errors: ValidationError[] = await validate(object);

        if (errors.length > 0) {
            const constraints = errors
                .map((error) => Object.values(error.constraints || {}))
                .reduce((acc, val) => acc.concat(val), [])
                .join(', ');
            return res.status(400).json({ message: 'Validation failed', error: constraints });
        } else {
            req.body = object;
            next();
        }
    };
};
