import 'reflect-metadata';
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

    const bodyObject = plainToClass(dto, req.body) as object;
    const queryObject = plainToClass(dto, req.query) as object;
    const paramObject = plainToClass(dto, req.params) as object;

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
        req.params = paramObject as any;
    }

    if (req.query) {
        req.query = queryObject as any;
    }

    next();
};

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates one part of the request against a DTO and replaces it with the result.
 * Unknown fields are never kept, so a client can't slip in something like `role: admin`.
 */
const validateRequestPart =
    (dto: any, part: RequestPart, { forbidUnknown }: { forbidUnknown: boolean }) =>
    async (req: DRequest, res: DResponse, next: DNextFunc) => {
        try {
            const object = plainToClass(dto, req[part] ?? {}, { enableImplicitConversion: true }) as object;

            const errors: ValidationError[] = await validate(object, {
                whitelist: true,
                forbidNonWhitelisted: forbidUnknown,
            });

            if (errors.length > 0) {
                const constraints = errors
                    .map((error) => Object.values(error.constraints || {}))
                    .reduce((acc, val) => acc.concat(val), [])
                    .join(', ');
                return res.status(400).json({ message: 'Validation failed', error: constraints });
            }

            req[part] = object as never;
            next();
        } catch (error) {
            next(error);
        }
    };

export const validateBodyMiddleware = (dto: any) => validateRequestPart(dto, 'body', { forbidUnknown: true });

export const validateParamMiddleware = (dto: any) => validateRequestPart(dto, 'params', { forbidUnknown: true });

// Unknown query keys are only dropped, matching @DQuery: tracking parameters are normal.
export const validateQueryMiddleware = (dto: any) => validateRequestPart(dto, 'query', { forbidUnknown: false });
